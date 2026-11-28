package ca.bc.gov.nrs.hrs.security;

import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.IDIR_USERNAME_ISSUED;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.idirAccessTokenClaims;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.jwt;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Pins the audit-column regression contract for the Cognito-to-SSO migration (epic #1506): a
 * Keycloak IDIR token must keep producing the {@code IDIR\jryan} audit string the database
 * already holds, instead of falling back to the raw {@code sub} claim.
 */
@DisplayName("Unit Test | DatabaseAuditor with Keycloak tokens (epic #1506)")
class KeycloakDatabaseAuditorTest {

  private final DatabaseAuditor databaseAuditor = new DatabaseAuditor();

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  @DisplayName(
      "a Keycloak azureidir token writes IDIR\\jryan - the same audit format Cognito writes today")
  void shouldWriteSameAuditFormatForKeycloakIdirToken() {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new JwtAuthenticationToken(
                jwt(idirAccessTokenClaims()),
                AuthorityUtils.createAuthorityList("WASTE_PLUS_ADMIN")));

    Optional<String> auditor = databaseAuditor.getCurrentAuditor();

    assertThat(auditor).contains("IDIR\\" + IDIR_USERNAME_ISSUED);
  }
}
