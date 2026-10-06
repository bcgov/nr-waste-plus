package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.configuration.SecurityConfiguration;
import ca.bc.gov.nrs.hrs.provider.cognito.CognitoUserInfoClient;
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
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Controller;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@WebMvcTest(controllers = JwtBearerFilterChainSecurityTest.ProtectedProbeController.class)
@ContextConfiguration(
    classes = {
      JwtBearerFilterChainSecurityTest.ProtectedProbeController.class,
      JwtBearerFilterChainSecurityTest.TestSecurityBeans.class,
      SecurityConfiguration.class
    })
@Import({SecurityConfiguration.class, JwtBearerFilterChainSecurityTest.TestSecurityBeans.class})
class JwtBearerFilterChainSecurityTest {

  private static final String ISSUER = "https://issuer.test.example/pool";
  private static final String JWKS_PATH = "/jwks";
  private static final AtomicInteger PROVIDER_INVOCATIONS = new AtomicInteger();
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
    registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri", JwtBearerFilterChainSecurityTest::jwksUri);
    registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
    registry.add("spring.security.oauth2.resourceserver.jwt.client-id", () -> "client-good");
    registry.add("ca.bc.gov.nrs.self-uri", () -> "http://localhost");
  }

  @Test
  void validAccessTokenReachesProtectedController() throws Exception {
    PROVIDER_INVOCATIONS.set(0);

    mockMvc
        .perform(get("/api/users/protected").header("Authorization", "Bearer " + token("client-good", ISSUER, null)))
        .andExpect(status().isOk());

    assertThat(PROVIDER_INVOCATIONS).hasValue(1);
  }

  @Test
  void anonymousHealthIsPublicAndCarriesSecurityHeaders() throws Exception {
    mockMvc
        .perform(get("/actuator/health"))
        .andExpect(status().isOk())
        .andExpect(result -> assertThat(result.getResponse().getHeader("Content-Security-Policy"))
            .contains("default-src 'none'"))
        .andExpect(result -> assertThat(result.getResponse().getHeader("X-Content-Type-Options"))
            .isEqualTo("nosniff"))
        .andExpect(result -> assertThat(result.getResponse().getHeader("X-Frame-Options"))
            .isEqualTo("DENY"));
  }

  @Test
  void anonymousProtectedRouteReturnsUnauthorized() throws Exception {
    mockMvc.perform(get("/api/users/protected")).andExpect(status().isUnauthorized());
  }

  @Test
  void authenticatedInsufficientRoleReturnsForbiddenWithoutControllerInvocation() throws Exception {
    PROVIDER_INVOCATIONS.set(0);

    mockMvc
        .perform(
            get("/api/configuration/formulas")
                .header("Authorization", "Bearer " + token("client-good", ISSUER, null)))
        .andExpect(status().isForbidden());

    assertThat(PROVIDER_INVOCATIONS).hasValue(0);
  }

  @Test
  void wrongClientIdDoesNotReachProtectedController() throws Exception {
    assertRejectedWithoutProvider(token("client-other", ISSUER, null));
  }

  @Test
  void missingClientIdDoesNotReachProtectedController() throws Exception {
    assertRejectedWithoutProvider(token(null, ISSUER, null));
  }

  @Test
  void wrongIssuerDoesNotReachProtectedController() throws Exception {
    assertRejectedWithoutProvider(token("client-good", "https://issuer-other.test/pool", null));
  }

  @Test
  void expiredTokenDoesNotReachProtectedController() throws Exception {
    assertRejectedWithoutProvider(token("client-good", ISSUER, null, Instant.now().minusSeconds(60)));
  }

  @Test
  void alteredSignatureDoesNotReachProtectedController() throws Exception {
    String compact = token("client-good", ISSUER, null);
    int signatureStart = compact.lastIndexOf('.') + 1;
    int alteredIndex = signatureStart + 1;
    char original = compact.charAt(alteredIndex);
    char replacement = original == 'A' ? 'B' : 'A';
    String altered = compact.substring(0, alteredIndex) + replacement + compact.substring(alteredIndex + 1);
    assertRejectedWithoutProvider(altered);
  }

  private void assertRejectedWithoutProvider(String compactToken) throws Exception {
    PROVIDER_INVOCATIONS.set(0);

    mockMvc
        .perform(get("/api/users/protected").with(csrf()).header("Authorization", "Bearer " + compactToken))
        .andExpect(status().isUnauthorized());

    assertThat(PROVIDER_INVOCATIONS).hasValue(0);
  }

  private static String token(String clientId, String issuer, String audience) {
    return token(clientId, issuer, audience, Instant.now().plusSeconds(60));
  }

  private static String token(String clientId, String issuer, String audience, Instant expiresAt) {
    JwtClaimsSet.Builder claims =
        JwtClaimsSet.builder()
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
    return encoder
        .encode(
            JwtEncoderParameters.from(
                JwsHeader.with(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256)
                    .keyId("synthetic-key")
                    .build(),
                claims.build()))
        .getTokenValue();
  }

  private static String jwksUri() {
    return "http://localhost:" + jwksServer.getAddress().getPort() + JWKS_PATH;
  }

  @Controller
  static class ProtectedProbeController {

    @GetMapping("/api/users/protected")
    @ResponseBody
    String protectedEndpoint() {
      PROVIDER_INVOCATIONS.incrementAndGet();
      return "provider-result";
    }

    @GetMapping("/actuator/health")
    @ResponseBody
    String health() {
      return "{\"status\":\"UP\"}";
    }
  }

  @TestConfiguration
  static class TestSecurityBeans {

    @Bean
    CognitoUserInfoClient cognitoUserInfoClient() {
      return mock(CognitoUserInfoClient.class);
    }

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
    JwtRoleAuthorizationManagerFactory jwtRoleAuthorizationManagerFactory(JwtRoleChecker checker) {
      return new JwtRoleAuthorizationManagerFactory(checker);
    }

    @Bean
    ApiAuthorizationCustomizer apiAuthorizationCustomizer(JwtRoleAuthorizationManagerFactory factory) {
      return new ApiAuthorizationCustomizer(factory);
    }

    @Bean
    Oauth2SecurityCustomizer oauth2SecurityCustomizer(CognitoUserInfoClient client) {
      return new Oauth2SecurityCustomizer(client, ISSUER, "client-good", jwksUri());
    }
  }
}
