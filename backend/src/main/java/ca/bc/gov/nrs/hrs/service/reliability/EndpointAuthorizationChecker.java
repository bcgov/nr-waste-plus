package ca.bc.gov.nrs.hrs.service.reliability;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;

/**
 * Validates caller resource authorization prior to replaying a cached idempotent response.
 */
@FunctionalInterface
public interface EndpointAuthorizationChecker {

  /**
   * Checks whether the current caller is authorized to access the requested resource.
   *
   * @param request the incoming HTTP servlet request
   * @param authentication the authenticated caller principal
   */
  void checkAuthorization(HttpServletRequest request, Authentication authentication);
}

