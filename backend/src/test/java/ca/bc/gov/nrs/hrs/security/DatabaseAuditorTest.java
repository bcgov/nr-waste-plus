package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@DisplayName("Unit Test | DatabaseAuditor")
class DatabaseAuditorTest {

  private final DatabaseAuditor databaseAuditor = new DatabaseAuditor();

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  @DisplayName("returns structured user id when ID token claims are present")
  void shouldReturnStructuredUserIdWhenClaimsPresent() {
    Jwt jwt = jwt(Map.of(
        "sub", "sub-123",
        "custom:idp_name", "idir",
        "custom:idp_username", "jdoe",
        "custom:idp_user_id", "jdoe-id"
    ));
    SecurityContextHolder.getContext().setAuthentication(
        new JwtAuthenticationToken(jwt, AuthorityUtils.createAuthorityList("ROLE_USER")));

    Optional<String> auditor = databaseAuditor.getCurrentAuditor();

    assertThat(auditor).contains("IDIR\\jdoe");
  }

  @Test
  @DisplayName("falls back to sub when custom idp claims are absent")
  void shouldFallbackToSubWhenIdpClaimsMissing() {
    Jwt jwt = jwt(Map.of("sub", "sub-from-access-token"));
    SecurityContextHolder.getContext().setAuthentication(
        new JwtAuthenticationToken(jwt, AuthorityUtils.createAuthorityList("ROLE_USER")));

    Optional<String> auditor = databaseAuditor.getCurrentAuditor();

    assertThat(auditor).contains("sub-from-access-token");
  }

  @Test
  @DisplayName("returns empty when authentication is missing")
  void shouldReturnEmptyWhenAuthenticationMissing() {
    SecurityContextHolder.clearContext();

    Optional<String> auditor = databaseAuditor.getCurrentAuditor();

    assertThat(auditor).isEmpty();
  }

  @Test
  @DisplayName("returns empty when authentication is not authenticated")
  void shouldReturnEmptyWhenNotAuthenticated() {
    TestingAuthenticationToken authentication = new TestingAuthenticationToken("principal",
        "credentials");
    authentication.setAuthenticated(false);
    SecurityContextHolder.getContext().setAuthentication(authentication);

    Optional<String> auditor = databaseAuditor.getCurrentAuditor();

    assertThat(auditor).isEmpty();
  }

  private Jwt jwt(Map<String, Object> claims) {
    return Jwt.withTokenValue("token")
        .issuedAt(Instant.parse("2026-01-01T00:00:00Z"))
        .expiresAt(Instant.parse("2026-01-01T01:00:00Z"))
        .header("alg", "none")
        .claims(existing -> existing.putAll(claims))
        .build();
  }
}

