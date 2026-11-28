package ca.bc.gov.nrs.hrs.security;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.oauth2.server.resource.OAuth2ResourceServerConfigurer;
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
 * Customize OAuth2 resource server configuration to extract authorities from the Keycloak role
 * claims and to configure the JWK set URI.
 *
 * <p>Authorities come from the {@code client_roles} claim (CSS-era FAM). When that claim is absent
 * or empty, the converter falls back to {@code resource_access.<azp>.roles} (stock Keycloak).
 * {@code FAM:} bookkeeping entries (per-grant expiry records such as {@code
 * FAM:EXPIRES:2026-09-30:WASTE_PLUS_ADMIN}) never become authorities. Authority names keep no
 * prefix to match application roles.
 *
 * <p><strong>Token validation (epic #1506):</strong> the decoder requires the {@code azp}
 * (authorized party) claim to match the configured {@code client-id}. As a transitional measure for
 * the Cognito-to-Keycloak migration, a token that carries no {@code azp} is still accepted when its
 * legacy {@code client_id} claim matches; that fallback branch is removed in the S3 sweep of the
 * migration.
 */
@Component
public class Oauth2SecurityCustomizer implements
    Customizer<OAuth2ResourceServerConfigurer<HttpSecurity>> {

  /** Claim naming the authorized party in Keycloak access tokens. */
  static final String CLAIM_AZP = "azp";

  /** Legacy Cognito claim naming the client the token was issued to. */
  static final String CLAIM_CLIENT_ID = "client_id";

  /** Claim carrying the CSS-era FAM client roles (primary source of authorities). */
  static final String CLAIM_CLIENT_ROLES = "client_roles";

  /** Claim carrying stock-Keycloak per-client role maps (fallback source of authorities). */
  static final String CLAIM_RESOURCE_ACCESS = "resource_access";

  /** Prefix of FAM expiry-bookkeeping entries that must never become authorities. */
  static final String FAM_EXPIRY_PREFIX = "FAM:";

  @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
  String jwkSetUri;

  @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
  String issuerUri;

  @Value("${spring.security.oauth2.resourceserver.jwt.client-id}")
  String expectedClientId;

  @Override
  public void customize(
      OAuth2ResourceServerConfigurer<HttpSecurity> customize) {
    var decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    decoder.setJwtValidator(new org.springframework.security.oauth2.core
        .DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(issuerUri),
            new AzpClientIdValidator(expectedClientId)));
    customize.jwt(jwt -> jwt.jwtAuthenticationConverter(converter()).decoder(decoder));
  }

  /**
   * Validates that the token was issued for the configured client.
   *
   * <p>A token is accepted when its {@code azp} claim matches the expected client id. Transitional
   * fallback for epic #1506: a token without {@code azp} is also accepted while its legacy Cognito
   * {@code client_id} claim matches — the fallback is removed in the S3 sweep.
   */
  private record AzpClientIdValidator(String expectedClientId)
      implements OAuth2TokenValidator<Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      if (expectedClientId.equals(token.getClaimAsString(CLAIM_AZP))
          || expectedClientId.equals(token.getClaimAsString(CLAIM_CLIENT_ID))) {
        return OAuth2TokenValidatorResult.success();
      }
      return OAuth2TokenValidatorResult.failure(
          new OAuth2Error("invalid_token", "Token azp is not authorized", null));
    }
  }

  private Converter<Jwt, AbstractAuthenticationToken> converter() {
    return jwt -> new JwtAuthenticationToken(jwt, toAuthorities(jwt));
  }

  /**
   * Resolves the granted authorities of the token from the Keycloak role claims.
   *
   * <p>{@code client_roles} is the primary source; when absent or empty, {@code
   * resource_access.<azp>.roles} is consulted. {@code FAM:} expiry-bookkeeping entries are
   * filtered out and never become authorities.
   *
   * @param jwt the decoded access token
   * @return the granted authorities carried by the token
   */
  private Collection<GrantedAuthority> toAuthorities(Jwt jwt) {
    return readRoles(jwt).stream()
        .filter(role -> !role.startsWith(FAM_EXPIRY_PREFIX))
        .<GrantedAuthority>map(SimpleGrantedAuthority::new)
        .toList();
  }

  private List<String> readRoles(Jwt jwt) {
    if (jwt.getClaims().get(CLAIM_CLIENT_ROLES) instanceof List<?> clientRoles
        && !clientRoles.isEmpty()) {
      return toStringList(clientRoles);
    }
    return readResourceAccessRoles(jwt);
  }

  private List<String> readResourceAccessRoles(Jwt jwt) {
    if (!(jwt.getClaims().get(CLAIM_RESOURCE_ACCESS) instanceof Map<?, ?> resourceAccess)) {
      return List.of();
    }
    if (!(resourceAccess.get(jwt.getClaimAsString(CLAIM_AZP)) instanceof Map<?, ?> client)) {
      return List.of();
    }
    if (!(client.get("roles") instanceof List<?> roles)) {
      return List.of();
    }
    return toStringList(roles);
  }

  private static List<String> toStringList(List<?> entries) {
    return entries.stream()
        .filter(String.class::isInstance)
        .map(String.class::cast)
        .toList();
  }
}
