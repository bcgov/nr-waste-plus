package ca.bc.gov.nrs.hrs.service.reliability;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.security.ResourceScopeGuard;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Validates endpoint resource authorization before replaying cached idempotent responses.
 *
 * <p>Ensures that callers whose access to a resource (such as a reporting unit or client scope)
 * has been revoked since the initial request are not served cached response snapshots.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DefaultEndpointAuthorizationChecker implements EndpointAuthorizationChecker {

  private static final Pattern REPORTING_UNIT_PATH_PATTERN =
      Pattern.compile("^/api/reporting-units/(\\d+)(?:/.*)?$");
  private static final Pattern REPORTING_UNIT_COLLECTION_PATTERN =
      Pattern.compile("^/api/reporting-units/?$");

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  private final ResourceScopeGuard resourceScopeGuard;

  @Override
  public void checkAuthorization(HttpServletRequest request, Authentication authentication) {
    if (request == null) {
      return;
    }

    String path = request.getRequestURI();
    if (path == null) {
      return;
    }

    if ("POST".equalsIgnoreCase(request.getMethod())
        && REPORTING_UNIT_COLLECTION_PATTERN.matcher(path).matches()) {
      String clientNumber = extractClientNumber(request);
      validateReportingUnitCreationAccess(request, clientNumber, authentication);
      return;
    }

    Matcher matcher = REPORTING_UNIT_PATH_PATTERN.matcher(path);
    if (matcher.matches()) {
      Long reportingUnitId;
      try {
        reportingUnitId = Long.parseLong(matcher.group(1));
      } catch (NumberFormatException ex) {
        log.warn("Invalid reporting unit identifier in request path: {}", matcher.group(1));
        throw new ForbiddenException(
            "Invalid reporting unit identifier: " + matcher.group(1));
      }
      validateReportingUnitAccess(reportingUnitId, authentication, request.getMethod());
    }
  }

  private void validateReportingUnitCreationAccess(
      HttpServletRequest request, String clientNumber, Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new ForbiddenException(
          "Unauthenticated caller is not authorized to create a reporting unit");
    }

    if (clientNumber == null || clientNumber.isBlank()) {
      throw new ForbiddenException(
          "Missing or invalid client number in reporting unit creation request");
    }

    Object principal = authentication.getPrincipal();
    if (principal instanceof Jwt jwt) {
      boolean hasCreateRole =
          JwtPrincipalUtil.hasPrivilegedCreateRole(jwt)
              || JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, clientNumber);
      if (!hasCreateRole) {
        log.warn(
            "SECURITY: Caller {} attempted unauthorized replay creation for client {}",
            JwtPrincipalUtil.getUserId(jwt),
            clientNumber);
        throw new ForbiddenException(
            "User is not authorized to create a reporting unit for client " + clientNumber);
      }

      IdentityProvider idp =
          IdentityProvider.fromClaim(JwtPrincipalUtil.getProvider(jwt)).orElse(null);
      if (IdentityProvider.IDIR == idp) {
        Map<Role, List<String>> roles = JwtPrincipalUtil.getRoles(jwt);
        if (roles.containsKey(Role.DISTRICT)) {
          String districtCode = extractDistrictCode(request);
          Set<String> assignedDistricts = resourceScopeGuard.extractAssignedDistricts(jwt);
          if (districtCode == null
              || assignedDistricts.stream().noneMatch(d -> d.equalsIgnoreCase(districtCode))) {
            log.warn(
                "SECURITY: IDIR DISTRICT caller {} attempted unauthorized replay creation for district {}",
                JwtPrincipalUtil.getUserId(jwt),
                districtCode);
            throw new ForbiddenException(
                "User is not authorized to create a reporting unit for district " + districtCode);
          }
        }
      }
    } else {
      throw new ForbiddenException(
          "Authenticated caller is not authorized to create a reporting unit");
    }
  }

  private void validateReportingUnitAccess(
      Long reportingUnitId, Authentication authentication, String httpMethod) {
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new ForbiddenException(
          "Unauthenticated caller is not authorized to access reporting unit: "
              + reportingUnitId);
    }

    try {
      resourceScopeGuard.verify(authentication, reportingUnitId, httpMethod);
    } catch (ForbiddenException ex) {
      throw ex;
    } catch (Exception ex) {
      log.warn(
          "SECURITY: Authorization failed for replay on reporting unit {}: {}",
          reportingUnitId,
          ex.getMessage());
      throw ex;
    }
  }

  private byte[] extractBodyBytes(HttpServletRequest request) throws Exception {
    if (request instanceof CachedBodyHttpServletRequest cachedRequest) {
      return cachedRequest.getCachedBody();
    }
    return request.getInputStream().readAllBytes();
  }

  private String extractClientNumber(HttpServletRequest request) {
    try {
      byte[] bodyBytes = extractBodyBytes(request);
      if (bodyBytes == null || bodyBytes.length == 0) {
        return null;
      }
      JsonNode node = OBJECT_MAPPER.readTree(bodyBytes);
      JsonNode clientNode = node.get("clientNumber");
      if (clientNode != null && !clientNode.isNull() && !clientNode.asText().isBlank()) {
        return clientNode.asText().trim();
      }
      return null;
    } catch (Exception ex) {
      log.warn(
          "Failed to extract clientNumber from create reporting unit request body: {}",
          ex.getMessage());
      return null;
    }
  }

  private String extractDistrictCode(HttpServletRequest request) {
    try {
      byte[] bodyBytes = extractBodyBytes(request);
      if (bodyBytes == null || bodyBytes.length == 0) {
        return null;
      }
      JsonNode node = OBJECT_MAPPER.readTree(bodyBytes);
      JsonNode districtNode = node.get("districtCode");
      if (districtNode != null && !districtNode.isNull() && !districtNode.asText().isBlank()) {
        return districtNode.asText().trim();
      }
      return null;
    } catch (Exception ex) {
      log.warn(
          "Failed to extract districtCode from create reporting unit request body: {}",
          ex.getMessage());
      return null;
    }
  }
}
