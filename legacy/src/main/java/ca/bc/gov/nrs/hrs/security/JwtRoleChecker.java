package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import java.util.Locale;
import java.util.Optional;
import java.util.function.Predicate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtRoleChecker {

  public boolean hasRole(String role) {
    return hasRoleMatching(
        aRole -> aRole.equalsIgnoreCase(role) || aRole.startsWith((role + "_").toUpperCase(
            Locale.ROOT)));
  }

  public boolean hasConcreteRole(String role) {
    return hasRoleMatching(aRole -> aRole.equalsIgnoreCase(role));
  }

  public boolean hasAbstractRole(String rolePrefix, String clientId) {
    return hasRoleMatching(aRole -> aRole.equalsIgnoreCase(rolePrefix + "_" + clientId));
  }

  public boolean hasRoleMatching(Predicate<String> matcher) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || !authentication.isAuthenticated()) {
      return false;
    }

    return authentication
        .getAuthorities()
        .stream()
        .map(GrantedAuthority::getAuthority)
        .map(String::toUpperCase)
        .anyMatch(matcher);
  }

  public boolean hasIdpProvider(String provider) {
    Optional<IdentityProvider> idp = IdentityProvider.fromClaim(provider);
    return idp.filter(this::hasIdpProvider).isPresent();
  }

  public boolean hasIdpProvider(IdentityProvider identityProvider) {
    return JwtPrincipalUtil
        .getIdentityProvider(getJwt())
        .equals(identityProvider);

  }

  private Jwt getJwt() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
      return jwt;
    }
    throw new IllegalStateException("JWT not available");
  }
}

