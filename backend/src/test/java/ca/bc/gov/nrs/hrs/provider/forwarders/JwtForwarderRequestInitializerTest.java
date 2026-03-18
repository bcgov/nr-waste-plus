package ca.bc.gov.nrs.hrs.provider.forwarders;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@DisplayName("Unit Test | JwtForwarderRequestInitializer")
class JwtForwarderRequestInitializerTest {

  private JwtForwarderRequestInitializer initializer;

  @BeforeEach
  void setup() {
    initializer = new JwtForwarderRequestInitializer();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Nested
  @DisplayName("when a JwtAuthenticationToken is present")
  class WithJwtAuthentication {

    @Test
    @DisplayName("should add Authorization header with Bearer token")
    void shouldAddAuthorizationHeader() {
      String tokenValue = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.signature";
      Jwt jwt = new Jwt(
          tokenValue,
          Instant.now(),
          Instant.now().plusSeconds(300),
          Map.of("alg", "RS256"),
          Map.of("sub", "user123")
      );
      JwtAuthenticationToken jwtAuth = new JwtAuthenticationToken(jwt, Collections.emptyList());
      SecurityContextHolder.getContext().setAuthentication(jwtAuth);

      MockClientHttpRequest request = new MockClientHttpRequest();
      initializer.initialize(request);

      assertEquals(
          "Bearer " + tokenValue,
          request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION)
      );
    }
  }

  @Nested
  @DisplayName("when no authentication is present")
  class WithNoAuthentication {

    @Test
    @DisplayName("should add Authorization header with Bearer null")
    void shouldAddBearerNullWhenNoAuth() {
      SecurityContextHolder.clearContext();

      MockClientHttpRequest request = new MockClientHttpRequest();
      initializer.initialize(request);

      assertEquals(
          "Bearer null",
          request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION)
      );
    }
  }

  @Nested
  @DisplayName("when authentication is not a JwtAuthenticationToken")
  class WithNonJwtAuthentication {

    @Test
    @DisplayName("should add Authorization header with Bearer null for non-JWT auth")
    void shouldAddBearerNullForNonJwtAuth() {
      TestingAuthenticationToken auth =
          new TestingAuthenticationToken("user", "password", "ROLE_USER");
      auth.setAuthenticated(true);
      SecurityContextHolder.getContext().setAuthentication(auth);

      MockClientHttpRequest request = new MockClientHttpRequest();
      initializer.initialize(request);

      assertEquals(
          "Bearer null",
          request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION)
      );
    }
  }
}

