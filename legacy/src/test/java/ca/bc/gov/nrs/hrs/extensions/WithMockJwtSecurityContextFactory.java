package ca.bc.gov.nrs.hrs.extensions;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.jetbrains.annotations.NotNull;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

/**
 * Factory that creates a mock JWT-based {@link SecurityContext} for tests.
 */
public class WithMockJwtSecurityContextFactory implements WithSecurityContextFactory<WithMockJwt> {

  @Override
  public @NotNull SecurityContext createSecurityContext(WithMockJwt annotation) {
    Jwt jwt = createJwt(annotation);

    List<GrantedAuthority> authorities = AuthorityUtils.createAuthorityList(
        annotation.cognitoGroups());
    JwtAuthenticationToken token = new JwtAuthenticationToken(jwt, authorities);

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(token);

    return context;
  }

  /**
   * Builds a mock JWT from the full annotation, including the Keycloak-shaped attributes
   * (epic #1506) when they are set.
   *
   * @param annotation the annotation carrying every attribute value
   * @return a populated {@link Jwt}
   */
  private static Jwt createJwt(WithMockJwt annotation) {
    Map<String, Object> claims = createClaims(
        annotation.value(),
        Arrays.asList(annotation.cognitoGroups()),
        annotation.idp(),
        annotation.displayName(),
        annotation.email()
    );
    putKeycloakClaims(claims, annotation);

    Instant now = Instant.now();

    return Jwt
        .withTokenValue("token")
        .header("alg", "none")
        .header("typ", "JWT")
        .subject(annotation.value())
        .issuedAt(now)
        .expiresAt(now.plusSeconds(3600))
        .claims(jwtClaims -> jwtClaims.putAll(claims))
        .build();
  }

  /**
   * Merges the Keycloak-shaped attributes (epic #1506) into the claims map. Attributes left at
   * their default are omitted so Cognito-only tests keep their original claims.
   *
   * @param claims the mutable claims map of the mock token
   * @param annotation the annotation carrying the Keycloak attribute values
   */
  static void putKeycloakClaims(Map<String, Object> claims, WithMockJwt annotation) {
    if (!annotation.identityProvider().isEmpty()) {
      claims.put("identity_provider", annotation.identityProvider());
    }
    if (!annotation.idirUsername().isEmpty()) {
      claims.put("idir_username", annotation.idirUsername());
    }
    if (!annotation.idirUserGuid().isEmpty()) {
      claims.put("idir_user_guid", annotation.idirUserGuid());
    }
    if (!annotation.azp().isEmpty()) {
      claims.put("azp", annotation.azp());
    }
    if (annotation.clientRoles().length > 0) {
      claims.put("client_roles", Arrays.asList(annotation.clientRoles()));
    }
  }

  /**
   * Builds a mock JWT instance populated from the annotation values.
   *
   * @param value the token subject
   * @param cognitoGroups the Cognito groups claim
   * @param idp the identity provider claim
   * @param displayName the display name claim
   * @param email the email claim
   * @return a populated {@link Jwt}
   */
  public static Jwt createJwt(
      String value,
      List<String> cognitoGroups,
      String idp,
      String displayName,
      String email
  ) {
    Instant now = Instant.now();

    return Jwt
        .withTokenValue("token")
        .header("alg", "none")
        .header("typ", "JWT")
        .subject(value)
        .issuedAt(now)
        .expiresAt(now.plusSeconds(3600))
        .claims(jwtClaims -> jwtClaims.putAll(
            createClaims(value, cognitoGroups, idp, displayName, email))
        )
        .build();
  }

  /**
   * Creates the claims map used by the mock JWT.
   *
   * @param value the token subject
   * @param cognitoGroups the Cognito groups claim
   * @param idp the identity provider claim
   * @param displayName the display name claim
   * @param email the email claim
   * @return a mutable map of claims
   */
  public static Map<String, Object> createClaims(
      String value,
      List<String> cognitoGroups,
      String idp,
      String displayName,
      String email
  ) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("sub", value);
    claims.put("cognito:groups", cognitoGroups);
    claims.put("custom:idp_name", idp);
    claims.put("custom:idp_username", value);
    claims.put("custom:idp_display_name", displayName);
    claims.put("email", email);
    return claims;
  }
}