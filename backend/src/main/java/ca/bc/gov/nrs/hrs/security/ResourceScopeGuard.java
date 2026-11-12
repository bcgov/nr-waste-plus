package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.tracing.Tracer;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

/**
 * Enforces resource-scope authorization (client number for BCeID, district assignment for IDIR)
 * across Reporting Unit and Block API operations before domain logic runs.
 *
 * <p>Enforces the following business rules:
 * <ul>
 *   <li>IDIR ADMIN and AREA callers carry cross-district privileges and are unrestricted by scope.</li>
 *   <li>IDIR DISTRICT scope is restricted to their assigned district code.</li>
 *   <li>BCeID SUBMITTER and VIEWER scope is restricted to Reporting Units owned by their client number.</li>
 *   <li>Resources outside the requester's scope return HTTP 404, matching the "no existence disclosure"
 *       rule (never HTTP 403). Note: the route-level filter gate returns HTTP 403 for unauthorized roles or invalid principals.</li>
 *   <li>VIEWER role (either provider) is read-only: HTTP 200 on in-scope reads, HTTP 403 on in-scope
 *       writes, and HTTP 404 on out-of-scope resources.</li>
 *   <li>IDIR VIEWER without an assigned district fails closed (HTTP 404).</li>
 *   <li>Unsupported or unresolved identity providers fail closed with HTTP 401/403.</li>
 *   <li>Every authorization failure is logged with a correlation ID for audit purposes.</li>
 * </ul>
 */
@Component
@Slf4j
public class ResourceScopeGuard {

  private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

  private final ReportingUnitRepository reportingUnitRepository;
  private final LegacyApiProvider legacyApiProvider;
  private final Tracer tracer;

  @Autowired
  public ResourceScopeGuard(
      ReportingUnitRepository reportingUnitRepository,
      LegacyApiProvider legacyApiProvider,
      @Autowired(required = false) Tracer tracer) {
    this.reportingUnitRepository = reportingUnitRepository;
    this.legacyApiProvider = legacyApiProvider;
    this.tracer = tracer;
  }

  /**
   * Verifies that the authenticated caller has access to the specified reporting unit,
   * inferring the HTTP method from the current request context. Fails closed if no request context exists.
   *
   * @param authentication the current Spring Security authentication
   * @param reportingUnitId the target reporting unit identifier
   */
  public void verify(Authentication authentication, Long reportingUnitId) {
    HttpServletRequest request = currentRequest();
    if (request == null) {
      logSecurityDenied(
          extractJwt(authentication),
          reportingUnitId,
          "UNKNOWN",
          "Cannot infer HTTP method: no active request context");
      throw new IllegalStateException("Cannot determine HTTP method: no active HTTP request context");
    }
    verify(authentication, reportingUnitId, request.getMethod());
  }

  /**
   * Verifies that the JWT caller has access to the specified reporting unit,
   * inferring the HTTP method from the current request context. Fails closed if no request context exists.
   *
   * @param jwt the caller's JWT token
   * @param reportingUnitId the target reporting unit identifier
   */
  public void verify(Jwt jwt, Long reportingUnitId) {
    HttpServletRequest request = currentRequest();
    if (request == null) {
      logSecurityDenied(jwt, reportingUnitId, "UNKNOWN", "Cannot infer HTTP method: no active request context");
      throw new IllegalStateException("Cannot determine HTTP method: no active HTTP request context");
    }
    verify(jwt, reportingUnitId, request.getMethod());
  }

  /**
   * Verifies access for the currently authenticated principal in {@link SecurityContextHolder}.
   *
   * @param reportingUnitId the target reporting unit identifier
   */
  public void verify(Long reportingUnitId) {
    verify(SecurityContextHolder.getContext().getAuthentication(), reportingUnitId);
  }

  /**
   * Verifies that the caller has access to the specified reporting unit for the given HTTP method.
   *
   * @param authentication the caller's authentication
   * @param reportingUnitId the target reporting unit identifier
   * @param httpMethod the HTTP method being performed (e.g. GET, POST, PUT, DELETE)
   */
  public void verify(Authentication authentication, Long reportingUnitId, String httpMethod) {
    if (authentication == null || !authentication.isAuthenticated()) {
      logSecurityDenied(null, reportingUnitId, httpMethod, "Unauthenticated request");
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
    }

    Jwt jwt = extractJwt(authentication);
    if (jwt == null) {
      logSecurityDenied(null, reportingUnitId, httpMethod, "Non-JWT principal");
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED, "Invalid authentication principal");
    }

    verify(jwt, reportingUnitId, httpMethod);
  }

  /**
   * Core verification logic enforcing role and provider scope rules against the target reporting unit.
   *
   * @param jwt the caller's JWT
   * @param reportingUnitId the target reporting unit identifier
   * @param httpMethod the HTTP method being executed
   */
  public void verify(Jwt jwt, Long reportingUnitId, String httpMethod) {
    if (reportingUnitId == null) {
      logSecurityDenied(jwt, null, httpMethod, "Reporting unit ID cannot be null");
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reporting unit ID cannot be null");
    }

    IdentityProvider idp = resolveIdentityProvider(jwt);
    if (idp == null) {
      logSecurityDenied(jwt, reportingUnitId, httpMethod, "Missing or unresolved identity provider");
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unresolved identity provider");
    }
    if (idp != IdentityProvider.IDIR && idp != IdentityProvider.BUSINESS_BCEID) {
      logSecurityDenied(jwt, reportingUnitId, httpMethod, "Unsupported identity provider: " + idp);
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Unsupported identity provider: " + idp.name());
    }

    Map<Role, List<String>> roles = JwtPrincipalUtil.getRoles(jwt);

    // IDIR ADMIN and AREA carry cross-district privileges and are unrestricted by scope
    if (IdentityProvider.IDIR == idp) {
      if (roles.containsKey(Role.ADMIN) || roles.containsKey(Role.AREA)) {
        return;
      }
    }

    // Resolve target reporting unit scope (clientNumber and districtCode)
    ReportingUnitScope targetScope = resolveTargetScope(reportingUnitId, jwt, httpMethod);

    // Enforce resource scope
    if (IdentityProvider.BUSINESS_BCEID == idp) {
      List<String> userClientNumbers = JwtPrincipalUtil.getClientFromRoles(jwt);
      if (!userClientNumbers.contains(targetScope.clientNumber())) {
        logSecurityDenied(
            jwt,
            reportingUnitId,
            httpMethod,
            "BCeID user assigned clients " + userClientNumbers
                + " does not match target RU client " + targetScope.clientNumber());
        throw new ReportingUnitNotFoundException(reportingUnitId);
      }
    } else if (IdentityProvider.IDIR == idp) {
      if (roles.containsKey(Role.DISTRICT)) {
        Set<String> assignedDistricts = extractAssignedDistricts(jwt);
        boolean matches = assignedDistricts.stream()
            .anyMatch(d -> d.equalsIgnoreCase(targetScope.districtCode()));
        if (!matches) {
          logSecurityDenied(
              jwt,
              reportingUnitId,
              httpMethod,
              "IDIR DISTRICT user assigned districts " + assignedDistricts
                  + " does not match target RU district " + targetScope.districtCode());
          throw new ReportingUnitNotFoundException(reportingUnitId);
        }
      } else if (roles.containsKey(Role.VIEWER)) {
        Set<String> assignedDistricts = extractAssignedDistricts(jwt);
        if (assignedDistricts.isEmpty()) {
          logSecurityDenied(
              jwt,
              reportingUnitId,
              httpMethod,
              "IDIR VIEWER has no assigned district: access denied");
          throw new ReportingUnitNotFoundException(reportingUnitId);
        }
        boolean matches = assignedDistricts.stream()
            .anyMatch(d -> d.equalsIgnoreCase(targetScope.districtCode()));
        if (!matches) {
          logSecurityDenied(
              jwt,
              reportingUnitId,
              httpMethod,
              "IDIR VIEWER user assigned districts " + assignedDistricts
                  + " does not match target RU district " + targetScope.districtCode());
          throw new ReportingUnitNotFoundException(reportingUnitId);
        }
      }
    }

    // The target resource is IN-SCOPE. Now check write permission:
    boolean isWrite = httpMethod != null && WRITE_METHODS.contains(httpMethod.toUpperCase(Locale.ROOT));
    if (isWrite) {
      if (IdentityProvider.BUSINESS_BCEID == idp) {
        boolean hasSubmitterOnClient =
            JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, targetScope.clientNumber());
        if (!hasSubmitterOnClient) {
          logSecurityDenied(
              jwt,
              reportingUnitId,
              httpMethod,
              "BCeID user lacks SUBMITTER role for target client " + targetScope.clientNumber());
          throw new ResponseStatusException(
              HttpStatus.FORBIDDEN, "User lacks write permission for this client");
        }
      } else {
        boolean hasWriteRole = roles.containsKey(Role.ADMIN)
            || roles.containsKey(Role.AREA)
            || roles.containsKey(Role.DISTRICT)
            || roles.containsKey(Role.SUBMITTER);
        if (!hasWriteRole) {
          logSecurityDenied(
              jwt,
              reportingUnitId,
              httpMethod,
              "Viewer role cannot perform write operation");
          throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Viewer role is read-only");
        }
      }
    }
  }

  /**
   * Extracts assigned district identifiers from groups or token claims.
   *
   * @param jwt the caller JWT
   * @return set of assigned district code strings
   */
  public Set<String> extractAssignedDistricts(Jwt jwt) {
    Set<String> districts = new HashSet<>();
    if (jwt == null) {
      return districts;
    }

    // Roles parsed from cognito:groups, e.g. WASTE_PLUS_DISTRICT_DKM -> ["DKM"]
    Map<Role, List<String>> roles = JwtPrincipalUtil.getRoles(jwt);
    if (roles.containsKey(Role.DISTRICT)) {
      districts.addAll(roles.get(Role.DISTRICT));
    }
    if (roles.containsKey(Role.VIEWER)) {
      districts.addAll(roles.get(Role.VIEWER));
    }

    // Custom claims emitted by IdP
    List<String> claimKeys = List.of("custom:idp_district", "custom:district");
    for (String key : claimKeys) {
      Object val = jwt.getClaims().get(key);
      if (val instanceof String s && !s.isBlank()) {
        districts.add(s.trim());
      }
    }

    return districts;
  }

  private record ReportingUnitScope(String clientNumber, String districtCode) {}

  private ReportingUnitScope resolveTargetScope(Long reportingUnitId, Jwt jwt, String httpMethod) {
    Optional<ReportingUnitEntity> pgRu =
        reportingUnitRepository.findByIdAndDeletedFalse(reportingUnitId);
    if (pgRu.isPresent()) {
      return new ReportingUnitScope(
          pgRu.get().getClientNumber(), pgRu.get().getGeographicCode());
    }

    try {
      ReportingUnitLegacyDetailsDto legacyRu =
          legacyApiProvider.getReportingUnitDetails(reportingUnitId);
      if (legacyRu != null) {
        String districtCode = legacyRu.district() != null ? legacyRu.district().code() : null;
        return new ReportingUnitScope(legacyRu.clientNumber(), districtCode);
      }
    } catch (ReportingUnitNotFoundException e) {
      logSecurityDenied(jwt, reportingUnitId, httpMethod, "Target reporting unit does not exist");
      throw e;
    } catch (Exception ex) {
      log.warn("Legacy reporting unit lookup failed for RU {}: {}", reportingUnitId, ex.getMessage(), ex);
      logSecurityDenied(jwt, reportingUnitId, httpMethod, "Legacy lookup error: " + ex.getMessage());
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Legacy reporting unit service unavailable", ex);
    }

    logSecurityDenied(jwt, reportingUnitId, httpMethod, "Target reporting unit does not exist");
    throw new ReportingUnitNotFoundException(reportingUnitId);
  }

  private Jwt extractJwt(Authentication authentication) {
    if (authentication instanceof JwtAuthenticationToken jwtAuth) {
      return jwtAuth.getToken();
    }
    if (authentication != null && authentication.getPrincipal() instanceof Jwt pJwt) {
      return pJwt;
    }
    return null;
  }

  private IdentityProvider resolveIdentityProvider(Jwt jwt) {
    try {
      return JwtPrincipalUtil.getIdentityProvider(jwt);
    } catch (Exception e) {
      return null;
    }
  }

  private HttpServletRequest currentRequest() {
    RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
    if (attributes instanceof ServletRequestAttributes servletAttributes) {
      return servletAttributes.getRequest();
    }
    return null;
  }

  private void logSecurityDenied(Jwt jwt, Long reportingUnitId, String httpMethod, String reason) {
    String correlationId = getCorrelationId();
    String userId = jwt != null ? JwtPrincipalUtil.getUserId(jwt) : "anonymous";
    String provider = jwt != null ? JwtPrincipalUtil.getProvider(jwt) : "unknown";
    HttpServletRequest request = currentRequest();
    String uri =
        request != null ? request.getRequestURI() : "/api/reporting-units/" + reportingUnitId;

    log.warn(
        "SECURITY_EVENT event=AUTHORIZATION_DENIED correlationId={} userId={} provider={} "
            + "method={} route={} targetReportingUnitId={} reason={}",
        correlationId,
        userId,
        provider,
        httpMethod != null ? httpMethod : "",
        uri,
        reportingUnitId,
        reason);
  }

  private String getCorrelationId() {
    if (tracer != null && tracer.currentSpan() != null) {
      return tracer.currentSpan().context().traceId();
    }
    String mdc = MDC.get("traceId");
    if (mdc != null && !mdc.isBlank()) {
      return mdc;
    }
    mdc = MDC.get("X-B3-TraceId");
    if (mdc != null && !mdc.isBlank()) {
      return mdc;
    }
    mdc = MDC.get("X-TRACE-ID");
    if (mdc != null && !mdc.isBlank()) {
      return mdc;
    }
    return "UNKNOWN";
  }
}
