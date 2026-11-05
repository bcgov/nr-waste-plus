package ca.bc.gov.nrs.hrs.util;

import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.IDIR_GUID_EMBEDDED;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.IDIR_GUID_ISSUED;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.IDIR_USERNAME_ISSUED;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.idirAccessTokenClaims;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.jwt;
import static org.junit.jupiter.api.Assertions.assertEquals;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Pins the Keycloak claim-mapping contract before the migration code exists (epic #1506, decision
 * D-006). Every test here is expected to fail against the current Cognito-shaped {@link
 * JwtPrincipalUtil} because the Keycloak claims ({@code identity_provider}, {@code idir_username},
 * {@code idir_user_guid}) are not read yet.
 */
@DisplayName("Unit Test | Keycloak claim mapping (epic #1506)")
class KeycloakClaimMappingTest {

  @ParameterizedTest(name = "identity_provider {0} maps to the audit provider string IDIR")
  @ValueSource(strings = {"azureidir", "AzureIDIR", "IDIR", "idir"})
  @DisplayName(
      "provider alias: every IDIR alias of identity_provider resolves to the audit string IDIR")
  void shouldMapEveryIdirAliasOfIdentityProviderToIdir(String identityProviderClaim) {
    Map<String, Object> claims = idirAccessTokenClaims();
    claims.put(KeycloakJwtFixtures.CLAIM_IDENTITY_PROVIDER, identityProviderClaim);
    Jwt token = jwt(claims);

    assertEquals("IDIR", JwtPrincipalUtil.getProvider(token));
    assertEquals(
        "IDIR", JwtPrincipalUtil.getProvider(new JwtAuthenticationToken(token, List.of())));
  }

  @ParameterizedTest(name = "fromClaim({0}) resolves to IdentityProvider.IDIR")
  @ValueSource(strings = {"azureidir", "AzureIDIR", "IDIR", "idir"})
  @DisplayName("provider alias: IdentityProvider.fromClaim accepts the azureidir alias")
  void shouldResolveEveryIdirAliasInFromClaim(String claimValue) {
    assertEquals(Optional.of(IdentityProvider.IDIR), IdentityProvider.fromClaim(claimValue));
  }

  @Test
  @DisplayName("provider alias: a Keycloak azureidir token resolves IdentityProvider.IDIR")
  void shouldResolveIdentityProviderFromKeycloakToken() {
    Jwt token = jwt(idirAccessTokenClaims());

    assertEquals(IdentityProvider.IDIR, JwtPrincipalUtil.getIdentityProvider(token));
  }

  @Test
  @DisplayName("guid case-fold: idir_username keeps its issued case in the username slot")
  void shouldKeepIdirUsernameInIssuedCase() {
    Jwt token = jwt(idirAccessTokenClaims());

    assertEquals(IDIR_USERNAME_ISSUED, JwtPrincipalUtil.getIdpUsername(token));
    assertEquals(
        "IDIR\\" + IDIR_USERNAME_ISSUED,
        JwtPrincipalUtil.getUserId(new JwtAuthenticationToken(token, List.of())));
  }

  @Test
  @DisplayName(
      "guid case-fold: the GUID is one uppercased identity whichever case each claim carries")
  void shouldCaseFoldGuidToSingleUppercaseIdentity() {
    Map<String, Object> guidUppercaseInGuidClaim = idirAccessTokenClaims();
    guidUppercaseInGuidClaim.remove(KeycloakJwtFixtures.CLAIM_IDIR_USERNAME);
    guidUppercaseInGuidClaim.put(KeycloakJwtFixtures.CLAIM_IDIR_USER_GUID, IDIR_GUID_ISSUED);
    guidUppercaseInGuidClaim.put("preferred_username", IDIR_GUID_EMBEDDED + "@azureidir");

    Map<String, Object> guidLowercaseInGuidClaim = idirAccessTokenClaims();
    guidLowercaseInGuidClaim.remove(KeycloakJwtFixtures.CLAIM_IDIR_USERNAME);
    guidLowercaseInGuidClaim.put(KeycloakJwtFixtures.CLAIM_IDIR_USER_GUID, IDIR_GUID_EMBEDDED);
    guidLowercaseInGuidClaim.put("preferred_username", IDIR_GUID_ISSUED + "@azureidir");

    String expectedUserId = "IDIR\\" + IDIR_GUID_ISSUED;

    assertEquals(expectedUserId, JwtPrincipalUtil.getUserId(jwt(guidUppercaseInGuidClaim)));
    assertEquals(expectedUserId, JwtPrincipalUtil.getUserId(jwt(guidLowercaseInGuidClaim)));
  }
}
