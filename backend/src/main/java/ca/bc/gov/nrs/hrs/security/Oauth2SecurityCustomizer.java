package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoClient;
import java.util.Collection;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Customize OAuth2 resource server configuration to extract authorities from the JWT's {@code
 * cognito:groups} claim and to configure the JWK set URI.
 *
 * <p>The customizer sets a {@link Converter} that uses the {@code cognito:groups} claim as the
 * primary source of granted authorities. When the access token carries no groups, which can happen
 * when an access token rather than an ID token is used, the converter falls back to calling the
 * Cognito {@code /oauth2/userInfo} endpoint to retrieve the groups from there. This guarantees that
 * role-based authorization decisions in {@link ApiAuthorizationCustomizer} always have authorities
 * available.
 */
@Component
public class Oauth2SecurityCustomizer
    implements Customizer<
        org.springframework.security.config.annotation.web.configurers.oauth2.server.resource
                .OAuth2ResourceServerConfigurer<
            HttpSecurity>> {

  private final CognitoUserInfoClient cognitoUserInfoClient;
  private final String issuerUri;
  private final String expectedClientId;

  private final String jwkSetUri;

  /**
   * Creates the customizer from the configured Cognito resource-server properties.
   *
   * @param cognitoUserInfoClient client used to resolve the caller's Cognito groups
   * @param issuerUri expected JWT issuer URI
   * @param expectedClientId {@code client_id} the token must carry
   * @param jwkSetUri JWK set used to verify token signatures
   */
  public Oauth2SecurityCustomizer(
      CognitoUserInfoClient cognitoUserInfoClient,
      @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri,
      @Value("${spring.security.oauth2.resourceserver.jwt.client-id}") String expectedClientId,
      @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri) {
    this.cognitoUserInfoClient = cognitoUserInfoClient;
    this.issuerUri = issuerUri;
    this.expectedClientId = expectedClientId;
    this.jwkSetUri = jwkSetUri;
  }

  @Override
  public void customize(
      org.springframework.security.config.annotation.web.configurers.oauth2.server.resource
                  .OAuth2ResourceServerConfigurer<
              HttpSecurity>
          customize) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    decoder.setJwtValidator(
        new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(issuerUri),
            new ClientIdValidator(expectedClientId)));
    customize.jwt(jwt -> jwt.jwtAuthenticationConverter(converter()).decoder(decoder));
  }

  private record ClientIdValidator(String expectedClientId)
      implements OAuth2TokenValidator<Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      String clientId = token.getClaimAsString("client_id");
      if (expectedClientId.equals(clientId)) {
        return OAuth2TokenValidatorResult.success();
      }
      return OAuth2TokenValidatorResult.failure(
          new OAuth2Error("invalid_token", "Token client_id is not authorized", null));
    }
  }

  private Converter<Jwt, AbstractAuthenticationToken> converter() {
    org.springframework.security.oauth2.server.resource.authentication
            .JwtGrantedAuthoritiesConverter
        authConverter =
            new org.springframework.security.oauth2.server.resource.authentication
                .JwtGrantedAuthoritiesConverter();
    authConverter.setAuthoritiesClaimName("cognito:groups");
    authConverter.setAuthorityPrefix("");

    return jwt -> {
      Collection<GrantedAuthority> authorities = authConverter.convert(jwt);

      if (authorities.isEmpty()) {
        authorities = fetchAuthoritiesFromUserInfo(jwt.getTokenValue());
      }

      return new JwtAuthenticationToken(jwt, authorities);
    };
  }

  private Collection<GrantedAuthority> fetchAuthoritiesFromUserInfo(String accessToken) {
    return cognitoUserInfoClient
        .fetchUserInfo(accessToken)
        .map(
            response ->
                response.groups().stream()
                    .<GrantedAuthority>map(SimpleGrantedAuthority::new)
                    .toList())
        .orElse(List.of());
  }
}
