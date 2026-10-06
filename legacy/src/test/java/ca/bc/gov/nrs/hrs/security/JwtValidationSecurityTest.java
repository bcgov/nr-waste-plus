package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;

class JwtValidationSecurityTest {

  private static final String ISSUER = "https://issuer.test.example/pool";
  private static HttpServer jwksServer;
  private static JwtEncoder encoder;
  private static JwtDecoder decoder;

  @BeforeAll
  static void startJwks() throws Exception {
    var keyPairGenerator = java.security.KeyPairGenerator.getInstance("RSA");
    keyPairGenerator.initialize(2048);
    var keyPair = keyPairGenerator.generateKeyPair();
    var key = new RSAKey.Builder((java.security.interfaces.RSAPublicKey) keyPair.getPublic())
        .privateKey((java.security.interfaces.RSAPrivateKey) keyPair.getPrivate())
        .keyID("synthetic-key")
        .build();
    JWKSource<SecurityContext> source = new ImmutableJWKSet<>(new JWKSet(key));
    encoder = new NimbusJwtEncoder(source);
    jwksServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
    var body = new JWKSet(key.toPublicJWK()).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    jwksServer.createContext("/jwks", exchange -> {
      exchange.getResponseHeaders().add("Content-Type", "application/json");
      exchange.sendResponseHeaders(200, body.length);
      try (var output = exchange.getResponseBody()) {
        output.write(body);
      }
    });
    jwksServer.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    jwksServer.start();
    decoder = NimbusJwtDecoder.withJwkSetUri("http://localhost:" + jwksServer.getAddress().getPort() + "/jwks").build();
    ((NimbusJwtDecoder) decoder).setJwtValidator(
        new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(ISSUER), new ClientIdValidator("client-good")));
  }

  @AfterAll
  static void stopJwks() {
    if (jwksServer != null) {
      jwksServer.stop(0);
    }
  }

  @Test
  void validAccessTokenReachesDecoder() {
    assertThat(decoder.decode(token("client-good", ISSUER, Instant.now().plusSeconds(60))).getClaimAsString("client_id"))
        .isEqualTo("client-good");
  }

  @Test
  void wrongClientIdMustBeRejected() {
    String compactToken = token("client-other", ISSUER, Instant.now().plusSeconds(60));
    assertThatThrownBy(() -> decoder.decode(compactToken))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void missingClientIdMustBeRejected() {
    String compactToken = token(null, ISSUER, Instant.now().plusSeconds(60));
    assertThatThrownBy(() -> decoder.decode(compactToken))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void wrongAudienceIsRecordedButNotRejected() {
    assertThat(decoder.decode(tokenWithAudience("client-good", ISSUER,
        "audience-other", Instant.now().plusSeconds(60))).getAudience())
        .containsExactly("audience-other");
  }

  @Test
  void wrongIssuerMustBeRejected() {
    String compactToken = token("client-good", "https://issuer-other.test/pool", Instant.now().plusSeconds(60));
    assertThatThrownBy(() -> decoder.decode(compactToken))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void expiredTokenMustBeRejected() {
    String compactToken = token("client-good", ISSUER, Instant.now().minusSeconds(60));
    assertThatThrownBy(() -> decoder.decode(compactToken))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void alteredSignatureMustBeRejected() {
    var compact = token("client-good", ISSUER, Instant.now().plusSeconds(60));
    int alteredIndex = compact.lastIndexOf('.') + 2;
    char original = compact.charAt(alteredIndex);
    var altered = compact.substring(0, alteredIndex)
        + (original == 'A' ? 'B' : 'A') + compact.substring(alteredIndex + 1);
    assertThatThrownBy(() -> decoder.decode(altered)).isInstanceOf(JwtException.class);
  }

  private static String token(String clientId, String issuer, Instant expiresAt) {
    return tokenWithAudience(clientId, issuer, null, expiresAt);
  }

  private static String tokenWithAudience(
      String clientId, String issuer, String audience, Instant expiresAt) {
    var issuedAt = expiresAt.isBefore(Instant.now())
        ? expiresAt.minusSeconds(60)
        : Instant.now();
    var claims = JwtClaimsSet.builder().issuer(issuer).subject("synthetic-subject")
        .issuedAt(issuedAt).expiresAt(expiresAt)
        .claims(existing -> {
          if (clientId != null) {
            existing.put("client_id", clientId);
          }
          if (audience != null) {
            existing.put("aud", java.util.List.of(audience));
          }
          existing.put("cognito:groups", java.util.List.of("WASTE_PLUS_VIEWER"));
        }).build();
    return encoder.encode(JwtEncoderParameters.from(
        JwsHeader.with(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256)
            .keyId("synthetic-key").build(), claims)).getTokenValue();
  }

  private record ClientIdValidator(String expectedClientId)
      implements OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(org.springframework.security.oauth2.jwt.Jwt token) {
      if (expectedClientId.equals(token.getClaimAsString("client_id"))) {
        return OAuth2TokenValidatorResult.success();
      }
      return OAuth2TokenValidatorResult.failure(
          new OAuth2Error("invalid_token", "Token client_id is not authorized", null));
    }
  }
}
