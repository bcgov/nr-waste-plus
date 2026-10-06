package ca.bc.gov.nrs.hrs.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.oauth2.server.resource.OAuth2ResourceServerConfigurer;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

/**
 * Customize OAuth2 resource server configuration to extract authorities
 * from the JWT's {@code cognito:groups} claim and to configure the JWK set URI.
 *
 * <p>The customizer sets a JwtAuthenticationConverter that uses the
 * {@code cognito:groups} claim as the source of granted authorities and
 * removes any prefix from authority names to match application roles.
 * </p>
 */
@Component
public class Oauth2SecurityCustomizer implements
    Customizer<OAuth2ResourceServerConfigurer<HttpSecurity>> {

  @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
  String jwkSetUri;

  @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
  String issuerUri;

  @Value("${spring.security.oauth2.resourceserver.jwt.client-id}")
  String expectedClientId;

  @Override
  public void customize(
      OAuth2ResourceServerConfigurer<HttpSecurity> customize) {
    var decoder = org.springframework.security.oauth2.jwt.NimbusJwtDecoder
        .withJwkSetUri(jwkSetUri).build();
    decoder.setJwtValidator(new org.springframework.security.oauth2.core
        .DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(issuerUri),
            new ClientIdValidator(expectedClientId)));
    customize.jwt(jwt -> jwt.jwtAuthenticationConverter(converter()).decoder(decoder));
  }

  private record ClientIdValidator(String expectedClientId)
      implements OAuth2TokenValidator<Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      if (expectedClientId.equals(token.getClaimAsString("client_id"))) {
        return OAuth2TokenValidatorResult.success();
      }
      return OAuth2TokenValidatorResult.failure(
          new OAuth2Error("invalid_token", "Token client_id is not authorized", null));
    }
  }

  private Converter<Jwt, AbstractAuthenticationToken> converter() {
    JwtGrantedAuthoritiesConverter authConverter = new JwtGrantedAuthoritiesConverter();
    authConverter.setAuthoritiesClaimName("cognito:groups");
    authConverter.setAuthorityPrefix("");

    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(authConverter);
    return converter;
  }

}
