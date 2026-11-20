package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

class DatabaseAuditorTest {

  private final DatabaseAuditor auditor = new DatabaseAuditor();

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void returnsEmptyWhenNoAuthenticationIsPresent() {
    SecurityContextHolder.clearContext();

    assertThat(auditor.getCurrentAuditor()).isEmpty();
  }

  @Test
  void returnsEmptyWhenAuthenticationIsUnauthenticated() {
    SecurityContextHolder.getContext().setAuthentication(
        UsernamePasswordAuthenticationToken.unauthenticated("user", "password"));

    assertThat(auditor.getCurrentAuditor()).isEmpty();
  }

  @Test
  void returnsEmptyWhenAuthenticatedPrincipalIsNotJwt() {
    SecurityContextHolder.getContext().setAuthentication(
        UsernamePasswordAuthenticationToken.authenticated("user", "", java.util.List.of()));

    assertThat(auditor.getCurrentAuditor()).isEmpty();
  }

  @Test
  void returnsUserIdFromAuthenticatedJwt() {
    Jwt jwt = Jwt.withTokenValue("token")
        .header("alg", "none")
        .issuedAt(Instant.EPOCH)
        .expiresAt(Instant.EPOCH.plusSeconds(60))
        .claim("custom:idp_name", "idir")
        .claim("custom:idp_username", "test-user")
        .build();
    SecurityContextHolder.getContext().setAuthentication(
        UsernamePasswordAuthenticationToken.authenticated(jwt, "", java.util.List.of()));

    assertThat(auditor.getCurrentAuditor()).contains("IDIR\\test-user");
  }
}
