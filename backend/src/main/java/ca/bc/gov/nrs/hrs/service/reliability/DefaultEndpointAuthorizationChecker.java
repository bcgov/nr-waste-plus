package ca.bc.gov.nrs.hrs.service.reliability;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
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
 * <p>Ensures that callers whose access to a resource (such as a reporting unit) has been revoked
 * since the initial request are not served cached response snapshots.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DefaultEndpointAuthorizationChecker implements EndpointAuthorizationChecker {

  private static final Pattern REPORTING_UNIT_PATH_PATTERN =
      Pattern.compile("^/api/reporting-units/(\\d+)(?:/.*)?$");

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
}

