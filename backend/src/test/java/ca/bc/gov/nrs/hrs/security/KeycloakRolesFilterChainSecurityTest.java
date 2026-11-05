package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
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
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;
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
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.FactorGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
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
 * Pins the Keycloak role-claim contract over the real security filter chain (epic #1506, decision
 * D-006): authorities must come from {@code client_roles} (CSS-era FAM) with {@code
 * resource_access.<azp>.roles} as the fallback source, and {@code FAM:} expiry bookkeeping entries
 * must never become authorities.
 *
 * <p>All tests here are expected to fail against the current converter, which reads only {@code
 * cognito:groups}.
 */
@WebMvcTest(controllers = KeycloakRolesFilterChainSecurityTest.AuthorityProbeController.class)
@ContextConfiguration(
    classes = {
      KeycloakRolesFilterChainSecurityTest.AuthorityProbeController.class,
      KeycloakRolesFilterChainSecurityTest.TestSecurityBeans.class,
      SecurityConfiguration.class
    })
@Import({SecurityConfiguration.class, KeycloakRolesFilterChainSecurityTest.TestSecurityBeans.class})
@DisplayName("Unit Test | Keycloak role claims over the filter chain (epic #1506)")
class KeycloakRolesFilterChainSecurityTest {

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
        KeycloakRolesFilterChainSecurityTest::jwksUri);
    registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> ISSUER);
    registry.add("spring.security.oauth2.resourceserver.jwt.client-id", () -> CLIENT_ID);
    registry.add("ca.bc.gov.nrs.self-uri", () -> "http://localhost");
  }

  @Test
  @DisplayName("client_roles grants authorities and FAM expiry entries are filtered out")
  void clientRolesGrantAuthoritiesAndFamEntriesAreFiltered() throws Exception {
    mockMvc
        .perform(
            get("/api/users/authorities")
                .header(
                    "Authorization",
                    "Bearer "
                        + keycloakToken(
                            Map.of(
                                "client_roles",
                                List.of(
                                    "WASTE_PLUS_ADMIN",
                                    "FAM:EXPIRES:2026-09-30:WASTE_PLUS_ADMIN")))))
        .andExpect(status().isOk())
        .andExpect(
            result ->
                assertThat(result.getResponse().getContentAsString())
                    .isEqualTo("WASTE_PLUS_ADMIN"));
  }

  @Test
  @DisplayName("resource_access.<azp>.roles is the fallback source of authorities")
  void resourceAccessRolesAreTheFallbackSourceOfAuthorities() throws Exception {
    mockMvc
        .perform(
            get("/api/users/authorities")
                .header(
                    "Authorization",
                    "Bearer "
                        + keycloakToken(
                            Map.of(
                                "resource_access",
                                Map.of(
                                    CLIENT_ID, Map.of("roles", List.of("WASTE_PLUS_ADMIN")))))))
        .andExpect(status().isOk())
        .andExpect(
            result ->
                assertThat(result.getResponse().getContentAsString())
                    .isEqualTo("WASTE_PLUS_ADMIN"));
  }

  @Test
  @DisplayName("client_roles takes precedence over resource_access when both are present")
  void clientRolesTakePrecedenceOverResourceAccessRoles() throws Exception {
    mockMvc
        .perform(
            get("/api/users/authorities")
                .header(
                    "Authorization",
                    "Bearer "
                        + keycloakToken(
                            Map.of(
                                "client_roles",
                                List.of("WASTE_PLUS_ADMIN"),
                                "resource_access",
                                Map.of(
                                    CLIENT_ID,
                                    Map.of("roles", List.of("WASTE_PLUS_VIEWER")))))))
        .andExpect(status().isOk())
        .andExpect(
            result ->
                assertThat(result.getResponse().getContentAsString())
                    .isEqualTo("WASTE_PLUS_ADMIN"));
  }

  @Test
  @DisplayName("FAM expiry entries never become authorities and never grant the admin route")
  void famExpiryEntriesNeverBecomeAuthorities() throws Exception {
    String token =
        keycloakToken(
            Map.of(
                "client_roles",
                List.of("WASTE_PLUS_VIEWER", "FAM:EXPIRES:2026-09-30:WASTE_PLUS_ADMIN")));

    mockMvc
        .perform(get("/api/users/authorities").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(
            result ->
                assertThat(result.getResponse().getContentAsString())
                    .isEqualTo("WASTE_PLUS_VIEWER"));

    mockMvc
        .perform(get("/api/configuration/formulas").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  private static String keycloakToken(Map<String, Object> extraClaims) {
    JwtClaimsSet.Builder claims =
        JwtClaimsSet.builder()
            .issuer(ISSUER)
            .subject("keycloak-subject")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(300))
            .claim("azp", CLIENT_ID)
            .claim("client_id", CLIENT_ID)
            .claim("identity_provider", "azureidir");
    extraClaims.forEach(claims::claim);
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
  static class AuthorityProbeController {

    @GetMapping("/api/users/authorities")
    @ResponseBody
    String authorities() {
      return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
          .map(GrantedAuthority::getAuthority)
          // Spring Security 7 stamps a bearer-factor marker on every JWT authentication; it is
          // framework bookkeeping, not a role, and must not pollute the contract under test.
          .filter(authority -> !FactorGrantedAuthority.BEARER_AUTHORITY.equals(authority))
          .collect(Collectors.joining(","));
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
    Oauth2SecurityCustomizer oauth2SecurityCustomizer(CognitoUserInfoClient client) {
      return new Oauth2SecurityCustomizer(client, ISSUER, CLIENT_ID, jwksUri());
    }
  }
}
