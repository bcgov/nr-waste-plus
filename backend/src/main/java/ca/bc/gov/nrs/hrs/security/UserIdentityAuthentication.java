package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.entity.users.UserIdentityEntity;
import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Custom {@link JwtAuthenticationToken} that carries a fully hydrated
 * {@link UserIdentityEntity} alongside the original JWT.
 *
 * <p>Placed into the {@code SecurityContext} by {@link UserIdentityHydrationFilter}
 * for requests that trigger identity hydration. Because this class extends
 * {@link JwtAuthenticationToken}, all existing code that reads authorities,
 * the JWT, or the principal directly continues to work without modification.</p>
 */
public class UserIdentityAuthentication extends JwtAuthenticationToken {

  private final UserIdentityEntity identity;

  /**
   * Construct a hydrated authentication token.
   *
   * @param jwt         the validated JWT from the current request
   * @param authorities the granted authorities resolved for this user
   * @param identity    the hydrated {@link UserIdentityEntity} for this user
   */
  public UserIdentityAuthentication(
      Jwt jwt,
      Collection<? extends GrantedAuthority> authorities,
      UserIdentityEntity identity
  ) {
    super(jwt, authorities);
    this.identity = identity;
  }

  /**
   * Return the hydrated identity entity for this user.
   *
   * @return the {@link UserIdentityEntity} carrying Cognito identity attributes
   */
  public UserIdentityEntity getIdentity() {
    return identity;
  }
}
