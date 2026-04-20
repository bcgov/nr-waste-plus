package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import java.util.Optional;
import org.apache.commons.lang3.StringUtils;
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
 * When the JWT is an ID token the structured user id from
 * {@link JwtPrincipalUtil#getUserId(Jwt)} (e.g. {@code IDIR/username}) is used.
 * When the JWT is an access token those claims may be absent, so the auditor
 * falls back to the raw Cognito {@code sub} claim to ensure audit columns are
 * always populated.
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
    return Optional.of(SecurityContextHolder.getContext())
        .map(SecurityContext::getAuthentication)
        .filter(Authentication::isAuthenticated)
        .map(Authentication::getPrincipal)
        .map(Jwt.class::cast)
        .map(jwt -> {
          String userId = JwtPrincipalUtil.getUserId(jwt);
          return StringUtils.isNotBlank(userId) ? userId : jwt.getSubject();
        });
  }
}

