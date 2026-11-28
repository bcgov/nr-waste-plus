package ca.bc.gov.nrs.hrs.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.configuration.SecurityConfiguration;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Pins the {@code azp} token-validation contract of {@link Oauth2SecurityCustomizer} over the real
 * security filter chain (epic #1506): a Keycloak access token is accepted when its {@code azp}
 * matches the configured client id; a foreign {@code azp} is rejected. While the migration is in
 * flight, a token without {@code azp} is still accepted when its legacy Cognito {@code client_id}
 * matches, and a token carrying neither claim is rejected.
 */
@WebMvcTest(controllers = KeycloakAzpValidationSecurityTest.AzpProbeController.class)
@ContextConfiguration(
    classes = {
      KeycloakAzpValidationSecurityTest.AzpProbeController.class,
      KeycloakAzpValidationSecurityTest.TestSecurityBeans.class,
      SecurityConfiguration.class
    })
@Import({SecurityConfiguration.class, KeycloakAzpValidationSecurityTest.TestSecurityBeans.class})
@DisplayName("Unit Test | Keycloak azp token validation over the filter chain (epic #1506)")
class KeycloakAzpValidationSecurityTest {

  private static final String ISSUER = "https://sso.test.example/realms/standard";
  private static final String JWKS_PATH = "/jwks";
  private static final String CLIENT_ID = "waste-plus";
  private static HttpServer jwksServer;
  private static JwtEncoder encoder;

  @Autowired private MockMvc mockMvc;

  @BeforeAll
  static void startJwks() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    KeyPair keyPair = generator.generateKeyPair();
    RSAKey key =
        new RSAKey.Builder((RSAPublicKey) keyPair.getPublic())
            .privateKey((RSAPrivateKey) keyPair.getPrivate())
            .keyID("synthetic-key")
            .build();
    JWKSource<SecurityContext> source = new ImmutableJWKSet<>(new JWKSet(key));
    encoder = new NimbusJwtEncoder(source);
    byte[] body = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
    jwksServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
    jwksServer.createContext(
        JWKS_PATH,
        exchange -> {
          exchange.getResponseHeaders().add("Content-Type", MediaType.APPLICATION_JSON_VALUE);
          exchange.sendResponseHeaders(200, body.length);
          try (var output = exchange.getResponseBody()) {
            output.write(body);
          }
        });
    jwksServer.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    jwksServer.start();
  }

  @AfterAll
  static void stopJwks() {
    if (jwksServer != null) {
      jwksServer.stop(0);
    }
  }

  @DynamicPropertySource
  static void securityProperties(DynamicPropertyRegistry registry) {
    registry.add(
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
        KeycloakAzpValidationSecurityTest::jwksUri);
    registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
    registry.add("spring.security.oauth2.resourceserver.jwt.client-id", () -> CLIENT_ID);
    registry.add("ca.bc.gov.nrs.self-uri", () -> "http://localhost");
  }

  @Test
  @DisplayName("a token whose azp matches the configured client id is accepted")
  void azpMatchingTokenIsAccepted() throws Exception {
    mockMvc
        .perform(
            get("/api/users/azp-probe")
                .header("Authorization", "Bearer " + token(Map.of("azp", CLIENT_ID))))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("a token with a foreign azp is rejected with 401")
  void foreignAzpIsRejected() throws Exception {
    mockMvc
        .perform(
            get("/api/users/azp-probe")
                .header("Authorization", "Bearer " + token(Map.of("azp", "another-client"))))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("a token without azp but with the legacy client_id is accepted (transitional)")
  void missingAzpWithLegacyClientIdIsAccepted() throws Exception {
    mockMvc
        .perform(
            get("/api/users/azp-probe")
                .header("Authorization", "Bearer " + token(Map.of("client_id", CLIENT_ID))))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("a token carrying neither azp nor client_id is rejected with 401")
  void tokenWithoutAzpAndClientIdIsRejected() throws Exception {
    mockMvc
        .perform(get("/api/users/azp-probe").header("Authorization", "Bearer " + token(Map.of())))
        .andExpect(status().isUnauthorized());
  }

  private static String token(Map<String, String> partyClaims) {
    JwtClaimsSet.Builder claims =
        JwtClaimsSet.builder()
            .issuer(ISSUER)
            .subject("keycloak-subject")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(300))
            .claim("identity_provider", "azureidir");
    partyClaims.forEach(claims::claim);
    return encoder
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).keyId("synthetic-key").build(),
                claims.build()))
        .getTokenValue();
  }

  private static String jwksUri() {
    return "http://localhost:" + jwksServer.getAddress().getPort() + JWKS_PATH;
  }

  @Controller
  static class AzpProbeController {

    @GetMapping("/api/users/azp-probe")
    @ResponseBody
    String probe() {
      return "reached";
    }
  }

  @TestConfiguration
  static class TestSecurityBeans {

    @Bean
    HeadersSecurityCustomizer headersSecurityCustomizer() {
      return new HeadersSecurityCustomizer();
    }

    @Bean
    CsrfSecurityCustomizer csrfSecurityCustomizer() {
      return new CsrfSecurityCustomizer();
    }

    @Bean
    CsrfAccessDeniedHandler csrfAccessDeniedHandler() {
      return new CsrfAccessDeniedHandler(new SecurityEventLoggingListener("backend-test", "test"));
    }

    @Bean
    JwtRoleChecker jwtRoleChecker() {
      return new JwtRoleChecker();
    }

    @Bean
    JwtRoleAuthorizationManagerFactory jwtRoleAuthorizationManagerFactory(
        JwtRoleChecker checker) {
      return new JwtRoleAuthorizationManagerFactory(checker);
    }

    @Bean
    ApiAuthorizationCustomizer apiAuthorizationCustomizer(
        JwtRoleAuthorizationManagerFactory factory) {
      return new ApiAuthorizationCustomizer(factory);
    }

    @Bean
    Oauth2SecurityCustomizer oauth2SecurityCustomizer() {
      return new Oauth2SecurityCustomizer(ISSUER, CLIENT_ID, jwksUri());
    }
  }
}
