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

/**
 * Utility bean used from SpEL expressions to check the currently authenticated principal's roles
 * and identity provider.
 *
 * <p>Provides convenience methods used in {@code @PreAuthorize} annotations (for example:
 * {@code @auth.hasConcreteRole(@roles.VIEWER)}).
 * </p>
 */
@Component
public class JwtRoleChecker {

  /**
   * Checks whether the authenticated principal has the supplied role or an abstract role derived
   * from it (e.g. {@code ROLE_PREFIX_12345}).
   *
   * @param role the role name to check
   * @return true if the principal has the role, false otherwise
   */
  public boolean hasRole(String role) {
    return hasRoleMatching(
        currentRole -> currentRole.equalsIgnoreCase(role)
                       || currentRole.startsWith((role + "_").toUpperCase(Locale.ROOT)
        )
    );
  }

  /**
   * Checks whether the authenticated principal has the concrete role.
   *
   * @param role the role name to check
   * @return true if the principal has the exact role, false otherwise
   */
  public boolean hasConcreteRole(String role) {
    return hasRoleMatching(currentRole -> currentRole.equalsIgnoreCase(role));
  }

  /**
   * Check whether the authenticated principal has an abstract role built from the provided prefix
   * and client id (prefix_clientId).
   *
   * @param rolePrefix the role prefix (e.g. PLANNER)
   * @param clientId   the client identifier to combine with the prefix
   * @return true if the principal has the combined abstract role
   */
  public boolean hasAbstractRole(String rolePrefix, String clientId) {
    return hasRoleMatching(currentRole ->
        currentRole.equalsIgnoreCase(rolePrefix + "_" + clientId)
    );
  }

  /**
   * Check roles using an arbitrary predicate against the upper-cased authority string.
   *
   * @param matcher predicate to apply to each authority string
   * @return true if any authority matches the predicate
   */
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

  /**
   * Convenience overload to check identity provider by string claim.
   *
   * @param provider the provider claim value
   * @return true if the authenticated principal's identity provider matches
   */
  public boolean hasIdpProvider(String provider) {
    Optional<IdentityProvider> idp = IdentityProvider.fromClaim(provider);
    return idp.filter(this::hasIdpProvider).isPresent();
  }

  /**
   * Check whether the authenticated principal's identity provider matches the supplied enum value.
   *
   * @param identityProvider the identity provider to check against
   * @return true if it matches, false otherwise
   */
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
