package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.stream.Stream;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Utility bean used from SpEL expressions to check the currently authenticated principal's roles
 * and identity provider.
 *
 * <p>Provides convenience methods used in {@code @PreAuthorize} annotations (for example:
 * {@code @auth.hasConcreteRole(@roles.VIEWER)}).
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
    return hasRole(SecurityContextHolder.getContext().getAuthentication(), role);
  }

  /**
   * Checks whether the supplied authentication principal has the specified {@link Role} using
   * boundary-aware matching.
   *
   * @param authentication the authentication to inspect
   * @param role the role enum
   * @return true if the principal has the role
   */
  public boolean hasRole(Authentication authentication, Role role) {
    if (role == null) {
      return false;
    }
    return hasRole(authentication, role.name());
  }

  /**
   * Checks whether the supplied authentication principal has the specified role string using
   * boundary-aware matching.
   *
   * @param authentication the authentication to inspect
   * @param role the role name to check
   * @return true if the principal has the role
   */
  public boolean hasRole(Authentication authentication, String role) {
    if (authentication == null || role == null) {
      return false;
    }
    String normalizedRole = role.toUpperCase(Locale.ROOT);
    return hasRoleMatching(
        authentication,
        currentRole ->
            currentRole.equals(normalizedRole)
                || currentRole.equals("WASTE_PLUS_" + normalizedRole)
                || currentRole.startsWith(normalizedRole + "_")
                || currentRole.startsWith("WASTE_PLUS_" + normalizedRole + "_"));
  }

  /**
   * Checks whether the authenticated principal has any write role (SUBMITTER, AREA, DISTRICT, ADMIN)
   * using boundary-aware matching.
   *
   * @param authentication the authentication to inspect
   * @return true if the principal has at least one write role
   */
  public boolean hasAnyWriteRole(Authentication authentication) {
    return hasRole(authentication, Role.SUBMITTER)
        || hasRole(authentication, Role.AREA)
        || hasRole(authentication, Role.DISTRICT)
        || hasRole(authentication, Role.ADMIN);
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
   * @param clientId the client identifier to combine with the prefix
   * @return true if the principal has the combined abstract role
   */
  public boolean hasAbstractRole(String rolePrefix, String clientId) {
    return hasRoleMatching(
        currentRole -> currentRole.equalsIgnoreCase(rolePrefix + "_" + clientId));
  }

  /**
   * Check roles using an arbitrary predicate against the upper-cased authority string.
   *
   * @param matcher predicate to apply to each authority string
   * @return true if any authority matches the predicate
   */
  public boolean hasRoleMatching(Predicate<String> matcher) {
    return hasRoleMatching(SecurityContextHolder.getContext().getAuthentication(), matcher);
  }

  /**
   * Check roles of the supplied authentication using an arbitrary predicate against upper-cased authorities.
   *
   * @param authentication the authentication to check
   * @param matcher predicate to apply to each authority string
   * @return true if any authority matches the predicate
   */
  public boolean hasRoleMatching(Authentication authentication, Predicate<String> matcher) {
    if (authentication == null || !authentication.isAuthenticated()) {
      return false;
    }

    return authentication.getAuthorities().stream()
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
    return JwtPrincipalUtil.getIdentityProvider(getJwt()).equals(identityProvider);
  }

  private Jwt getJwt() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
      return jwt;
    }
    throw new IllegalStateException("JWT not available");
  }

  /**
   * Checks whether the authenticated principal satisfies the route-gate rules:
   * <ul>
   *   <li>Principal is authenticated and carries at least one recognized role.</li>
   *   <li>Only IDIR and BUSINESS_BCEID identity providers are permitted.</li>
   *   <li>BCeID users never claim ADMIN, AREA, or DISTRICT roles.</li>
   *   <li>IDIR users carry a single role among ADMIN, AREA, DISTRICT, VIEWER.</li>
   * </ul>
   *
   * @param authentication the current authentication
   * @return true if the principal passes the route-gate checks, false otherwise
   */
  public boolean isValidRouteGatePrincipal(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      return false;
    }

    Jwt jwt = extractJwt(authentication);
    if (jwt == null) {
      return false;
    }

    IdentityProvider idp;
    try {
      idp = JwtPrincipalUtil.getIdentityProvider(jwt);
    } catch (Exception ex) {
      return false;
    }

    if (idp != IdentityProvider.IDIR && idp != IdentityProvider.BUSINESS_BCEID) {
      return false;
    }

    Map<Role, List<String>> roles = JwtPrincipalUtil.getRoles(jwt);

    if (IdentityProvider.BUSINESS_BCEID == idp) {
      boolean claimsForbiddenRole = roles.containsKey(Role.ADMIN)
          || roles.containsKey(Role.AREA)
          || roles.containsKey(Role.DISTRICT)
          || hasRole(authentication, Role.ADMIN)
          || hasRole(authentication, Role.AREA)
          || hasRole(authentication, Role.DISTRICT);
      if (claimsForbiddenRole) {
        return false;
      }
      return roles.containsKey(Role.SUBMITTER) || roles.containsKey(Role.VIEWER);
    }

    if (IdentityProvider.IDIR == idp) {
      long idirRoleCount = Stream.of(Role.ADMIN, Role.AREA, Role.DISTRICT, Role.VIEWER)
          .filter(roles::containsKey)
          .count();
      return idirRoleCount == 1;
    }

    return false;
  }

  private Jwt extractJwt(Authentication authentication) {
    if (authentication instanceof JwtAuthenticationToken jwtAuth) {
      return jwtAuth.getToken();
    }
    if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
      return jwt;
    }
    return null;
  }
}
