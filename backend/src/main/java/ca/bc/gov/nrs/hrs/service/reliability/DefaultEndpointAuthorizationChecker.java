package ca.bc.gov.nrs.hrs.service.reliability;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
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

  private final ReportingUnitRepository reportingUnitRepository;

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
      validateReportingUnitCreationAccess(clientNumber, authentication);
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
      validateReportingUnitAccess(reportingUnitId, authentication);
    }
  }

  private void validateReportingUnitCreationAccess(
      String clientNumber, Authentication authentication) {
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
      if (!JwtPrincipalUtil.hasPrivilegedCreateRole(jwt)
          && !JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, clientNumber)) {
        log.warn(
            "SECURITY: Caller {} attempted unauthorized replay creation for client {}",
            JwtPrincipalUtil.getUserId(jwt),
            clientNumber);
        throw new ForbiddenException(
            "User is not authorized to create a reporting unit for client " + clientNumber);
      }
    }
  }

  private void validateReportingUnitAccess(
      Long reportingUnitId, Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new ForbiddenException(
          "Unauthenticated caller is not authorized to access reporting unit: "
              + reportingUnitId);
    }

    Object principal = authentication.getPrincipal();
    if (principal instanceof Jwt jwt) {
      IdentityProvider idp =
          IdentityProvider.fromClaim(JwtPrincipalUtil.getProvider(jwt)).orElse(null);
      if (IdentityProvider.BUSINESS_BCEID == idp) {
        ReportingUnitEntity reportingUnit = reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ForbiddenException(
                "User is not authorized to access reporting unit: " + reportingUnitId));

        List<String> userClientNumbers = JwtPrincipalUtil.getClientFromRoles(jwt);
        if (!userClientNumbers.contains(reportingUnit.getClientNumber())) {
          log.warn(
              "SECURITY: BCeID user {} attempted unauthorized replay access to reporting unit {}",
              JwtPrincipalUtil.getUserId(jwt),
              reportingUnitId);
          throw new ForbiddenException(
              "User is not authorized to access reporting unit: " + reportingUnitId);
        }
      }
    }
  }

  private String extractClientNumber(HttpServletRequest request) {
    try {
      byte[] bodyBytes;
      if (request instanceof CachedBodyHttpServletRequest cachedRequest) {
        bodyBytes = cachedRequest.getCachedBody();
      } else {
        bodyBytes = request.getInputStream().readAllBytes();
      }
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
}
