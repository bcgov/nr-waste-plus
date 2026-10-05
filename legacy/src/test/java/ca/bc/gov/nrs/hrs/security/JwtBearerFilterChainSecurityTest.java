package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@WebMvcTest(controllers = JwtBearerFilterChainSecurityTest.ProtectedProbeController.class)
@ContextConfiguration(classes = {
    JwtBearerFilterChainSecurityTest.ProtectedProbeController.class,
    JwtBearerFilterChainSecurityTest.TestSecurityBeans.class,
    SecurityConfiguration.class
})
@Import({SecurityConfiguration.class, JwtBearerFilterChainSecurityTest.TestSecurityBeans.class})
class JwtBearerFilterChainSecurityTest {

  private static final String ISSUER = "https://issuer.test.example/pool";
  private static final String JWKS_PATH = "/jwks";
  private static final AtomicInteger CONTROLLER_INVOCATIONS = new AtomicInteger();
  private static HttpServer jwksServer;
  private static JwtEncoder encoder;

  @Autowired private MockMvc mockMvc;

  @BeforeAll
  static void startJwks() throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    KeyPair keyPair = generator.generateKeyPair();
    RSAKey key = new RSAKey.Builder((RSAPublicKey) keyPair.getPublic())
        .privateKey((RSAPrivateKey) keyPair.getPrivate())
        .keyID("synthetic-key")
        .build();
    JWKSource<SecurityContext> source = new ImmutableJWKSet<>(new JWKSet(key));
    encoder = new NimbusJwtEncoder(source);
    byte[] body = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
    jwksServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
    jwksServer.createContext(JWKS_PATH, exchange -> {
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
    registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
        JwtBearerFilterChainSecurityTest::jwksUri);
    registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
    registry.add("spring.security.oauth2.resourceserver.jwt.client-id", () -> "client-good");
    registry.add("ca.bc.gov.nrs.self-uri", () -> "http://localhost");
  }

  @Test
  void validTokenReachesProtectedController() throws Exception {
    CONTROLLER_INVOCATIONS.set(0);
    mockMvc.perform(get("/api/protected")
            .header("Authorization", "Bearer " + token("client-good", ISSUER, null)))
        .andExpect(status().isOk());
    assertThat(CONTROLLER_INVOCATIONS).hasValue(1);
  }

  @Test
  void anonymousProtectedRequestIsUnauthorizedBeforeController() throws Exception {
    CONTROLLER_INVOCATIONS.set(0);

    mockMvc.perform(get("/api/protected"))
        .andExpect(status().isUnauthorized());

    assertThat(CONTROLLER_INVOCATIONS).hasValue(0);
  }

  @Test
  void localEnvironmentAppliesRequiredSecurityHeaders() throws Exception {
    mockMvc.perform(get("/api/protected")
            .header("Authorization", "Bearer " + token("client-good", ISSUER, null)))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().string("X-Frame-Options", "DENY"))
        .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
        .andExpect(header().string("Content-Security-Policy",
            org.hamcrest.Matchers.containsString("default-src 'self'")));
  }

  @Test
  void wrongClientIdIsRejectedBeforeController() throws Exception {
    assertRejectedBeforeController(token("client-other", ISSUER, null));
  }

  @Test
  void missingClientIdIsRejectedBeforeController() throws Exception {
    assertRejectedBeforeController(token(null, ISSUER, null));
  }

  @Test
  void wrongIssuerIsRejectedBeforeController() throws Exception {
    assertRejectedBeforeController(token("client-good", "https://issuer-other.test/pool", null));
  }

  @Test
  void expiredTokenIsRejectedBeforeController() throws Exception {
    assertRejectedBeforeController(token("client-good", ISSUER, null, Instant.now().minusSeconds(60)));
  }

  @Test
  void alteredSignatureIsRejectedBeforeController() throws Exception {
    String compact = token("client-good", ISSUER, null);
    int alteredIndex = compact.lastIndexOf('.') + 2;
    char original = compact.charAt(alteredIndex);
    String altered = compact.substring(0, alteredIndex) + (original == 'A' ? 'B' : 'A')
        + compact.substring(alteredIndex + 1);
    assertRejectedBeforeController(altered);
  }

  @Test
  void wrongAudienceReachesProtectedController() throws Exception {
    assertAcceptedByProtectedRoute(token("client-good", ISSUER, "audience-other"));
  }

  private void assertAcceptedByProtectedRoute(String compactToken) throws Exception {
    CONTROLLER_INVOCATIONS.set(0);
    mockMvc.perform(get("/api/protected")
            .header("Authorization", "Bearer " + compactToken))
        .andExpect(status().isOk());
    assertThat(CONTROLLER_INVOCATIONS).hasValue(1);
  }

  private void assertRejectedBeforeController(String compactToken) throws Exception {
    CONTROLLER_INVOCATIONS.set(0);
    mockMvc.perform(get("/api/protected")
            .header("Authorization", "Bearer " + compactToken))
        .andExpect(status().isUnauthorized());
    assertThat(CONTROLLER_INVOCATIONS).hasValue(0);
  }

  private static String token(String clientId, String issuer, String audience) {
    return token(clientId, issuer, audience, Instant.now().plusSeconds(60));
  }

  private static String token(String clientId, String issuer, String audience, Instant expiresAt) {
    JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
        .issuer(issuer)
        .subject("synthetic-subject")
        .issuedAt(expiresAt.isBefore(Instant.now()) ? expiresAt.minusSeconds(120) : Instant.now())
        .expiresAt(expiresAt)
        .claim("cognito:groups", List.of("WASTE_PLUS_VIEWER"));
    if (clientId != null) {
      claims.claim("client_id", clientId);
    }
    if (audience != null) {
      claims.audience(List.of(audience));
    }
    return encoder.encode(JwtEncoderParameters.from(
        JwsHeader.with(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256)
            .keyId("synthetic-key").build(), claims.build())).getTokenValue();
  }

  private static String jwksUri() {
    return "http://localhost:" + jwksServer.getAddress().getPort() + JWKS_PATH;
  }

  @Controller
  static class ProtectedProbeController {
    @GetMapping("/api/protected")
    @ResponseBody
    String protectedEndpoint() {
      CONTROLLER_INVOCATIONS.incrementAndGet();
      return "controller-result";
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
      return new CsrfAccessDeniedHandler(new SecurityEventLoggingListener("legacy-test", "test"));
    }

    @Bean
    JwtRoleChecker jwtRoleChecker() {
      return new JwtRoleChecker();
    }

    @Bean
    ApiAuthorizationCustomizer apiAuthorizationCustomizer() {
      return new ApiAuthorizationCustomizer();
    }

    @Bean
    Oauth2SecurityCustomizer oauth2SecurityCustomizer() {
      return new Oauth2SecurityCustomizer();
    }
  }
}
