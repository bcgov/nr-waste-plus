package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.Executors;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
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
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(ISSUER),
            token -> "client-good".equals(token.getClaimAsString("client_id"))
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Unexpected client_id", null))));
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
    assertThatThrownBy(() -> decoder.decode(token("client-other", ISSUER, Instant.now().plusSeconds(60))))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void missingClientIdMustBeRejected() {
    assertThatThrownBy(() -> decoder.decode(token(null, ISSUER, Instant.now().plusSeconds(60))))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void accessTokenAudienceIsNotRequired() {
    assertThat(decoder.decode(tokenWithAudience("client-good", ISSUER,
        "audience-other", Instant.now().plusSeconds(60))).getClaimAsString("client_id"))
        .isEqualTo("client-good");
  }

  @Test
  void wrongIssuerMustBeRejected() {
    assertThatThrownBy(() -> decoder.decode(token("client-good", "https://issuer-other.test/pool", Instant.now().plusSeconds(60))))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void expiredTokenMustBeRejected() {
    assertThatThrownBy(() -> decoder.decode(token("client-good", ISSUER, Instant.now().minusSeconds(60))))
        .isInstanceOf(JwtException.class);
  }

  @Test
  void alteredSignatureMustBeRejected() {
    var compact = token("client-good", ISSUER, Instant.now().plusSeconds(60));
    var altered = compact.substring(0, compact.length() - 1) + (compact.endsWith("A") ? "B" : "A");
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
    var claims = JwtClaimsSet.builder()
        .issuer(issuer)
        .subject("synthetic-subject")
        .issuedAt(issuedAt)
        .expiresAt(expiresAt)
        .claims(existing -> {
          if (clientId != null) {
            existing.put("client_id", clientId);
          }
          if (audience != null) {
            existing.put("aud", java.util.List.of(audience));
          }
        })
        .claim("cognito:groups", java.util.List.of("WASTE_PLUS_VIEWER"))
        .build();
    return encoder.encode(JwtEncoderParameters.from(
        JwsHeader.with(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256)
            .keyId("synthetic-key").build(), claims)).getTokenValue();
  }
}
