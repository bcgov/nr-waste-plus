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
    Jwt jwt = createJwt(
        annotation.value(),
        Arrays.asList(annotation.cognitoGroups()),
        annotation.idp(),
        annotation.displayName(),
        annotation.email()
    );

    List<GrantedAuthority> authorities = AuthorityUtils.createAuthorityList(
        annotation.cognitoGroups());
    JwtAuthenticationToken token = new JwtAuthenticationToken(jwt, authorities);

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(token);

    return context;
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