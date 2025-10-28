package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import java.util.Optional;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * AuditorAware implementation that resolves the current user id from the
 * active JWT principal for Spring Data auditing.
 *
 * <p>When present the authenticated JWT's subject (user id) will be used as
 * the auditor value for created/modified auditing fields.
 * </p>
 */
@Component
public class DatabaseAuditor implements AuditorAware<String> {

  /**
   * Retrieve the current auditor (user id) from the Spring Security context.
   *
   * @return an Optional containing the current user id when authenticated
   */
  @Override
  public Optional<String> getCurrentAuditor() {
    return Optional.ofNullable(SecurityContextHolder.getContext())
        .map(SecurityContext::getAuthentication)
        .filter(Authentication::isAuthenticated)
        .map(Authentication::getPrincipal)
        .map(Jwt.class::cast)
        .map(JwtPrincipalUtil::getUserId);
  }
}