package ca.bc.gov.nrs.hrs.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.oauth2.server.resource.OAuth2ResourceServerConfigurer;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

/**
 * Customize OAuth2 resource server configuration to extract authorities
 * from the JWT's {@code cognito:groups} claim and to configure the JWK set URI.
 *
 * <p>
 * The customizer sets a JwtAuthenticationConverter that uses the
 * {@code cognito:groups} claim as the source of granted authorities and
 * removes any prefix from authority names to match application roles.
 * </p>
 */
@Component
public class Oauth2SecurityCustomizer implements
    Customizer<OAuth2ResourceServerConfigurer<HttpSecurity>> {

  @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
  String jwkSetUri;

  @Override
  public void customize(
      OAuth2ResourceServerConfigurer<HttpSecurity> customize) {
    customize.jwt(jwt -> jwt.jwtAuthenticationConverter(converter()).jwkSetUri(jwkSetUri));
  }

  private Converter<Jwt, AbstractAuthenticationToken> converter() {
    JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
    grantedAuthoritiesConverter.setAuthoritiesClaimName("cognito:groups");
    grantedAuthoritiesConverter.setAuthorityPrefix("");

    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
    return converter;
  }

}
