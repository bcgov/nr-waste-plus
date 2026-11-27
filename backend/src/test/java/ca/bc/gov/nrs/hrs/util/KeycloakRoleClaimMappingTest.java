package ca.bc.gov.nrs.hrs.util;

import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.CLAIM_CLIENT_ROLES;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.CLAIM_IDENTITY_PROVIDER;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.CLAIM_RESOURCE_ACCESS;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.idirAccessTokenClaims;
import static ca.bc.gov.nrs.hrs.util.KeycloakJwtFixtures.jwt;
import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Pins the CSS/Keycloak role-claim mapping used by the reporting-unit route gate and client
 * scoping. Roles come from {@code client_roles} first, then {@code resource_access.<azp>.roles},
 * with the legacy Cognito {@code cognito:groups} claim retained as a transitional fallback.
 * Identity-provider aliases are the ones the frontend maps in {@code authUtils.ts}: {@code
 * azureidir}/{@code idir} and {@code bceidbusiness}.
 */
@DisplayName("Unit Test | CSS role and IDP claim mapping (epic #1506)")
class KeycloakRoleClaimMappingTest {

  @Test
  @DisplayName("BCeID client_roles VIEWER_00001271 resolves as a scoped viewer role")
  void shouldResolveBceidViewerRoleFromClientRoles() {
    Map<String, Object> claims = bceidAccessTokenClaims();
    claims.put(CLAIM_CLIENT_ROLES, List.of("WASTE_PLUS_VIEWER_00001271"));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getGroups(token)).containsExactly("WASTE_PLUS_VIEWER_00001271");
    assertThat(JwtPrincipalUtil.getGroups(new JwtAuthenticationToken(token, List.of())))
        .containsExactly("WASTE_PLUS_VIEWER_00001271");
    assertThat(JwtPrincipalUtil.getRoles(token)).containsEntry(Role.VIEWER, List.of("00001271"));
    assertThat(JwtPrincipalUtil.getRoles(new JwtAuthenticationToken(token, List.of())))
        .containsEntry(Role.VIEWER, List.of("00001271"));
    assertThat(JwtPrincipalUtil.getClientFromRoles(token)).containsExactly("00001271");
    assertThat(JwtPrincipalUtil.hasAbstractRole(token, Role.VIEWER, "00001271")).isTrue();
  }

  @Test
  @DisplayName("IDIR client_roles ADMIN resolves as a concrete admin role")
  void shouldResolveIdirAdminRoleFromClientRoles() {
    Map<String, Object> claims = idirAccessTokenClaims();
    claims.put(CLAIM_CLIENT_ROLES, List.of("WASTE_PLUS_ADMIN"));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getRoles(token)).containsOnlyKeys(Role.ADMIN);
    assertThat(JwtPrincipalUtil.hasConcreteRole(token, Role.ADMIN)).isTrue();
    assertThat(JwtPrincipalUtil.getIdentityProvider(token)).isEqualTo(IdentityProvider.IDIR);
  }

  @Test
  @DisplayName("resource_access.<azp>.roles is used when client_roles is absent")
  void shouldFallBackToResourceAccessRoles() {
    Map<String, Object> claims = idirAccessTokenClaims();
    claims.put("azp", "waste-plus");
    claims.put(
        CLAIM_RESOURCE_ACCESS,
        Map.of("waste-plus", Map.of("roles", List.of("WASTE_PLUS_DISTRICT_DKM"))));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getGroups(token)).containsExactly("WASTE_PLUS_DISTRICT_DKM");
    assertThat(JwtPrincipalUtil.getRoles(token)).containsEntry(Role.DISTRICT, List.of("DKM"));
  }

  @Test
  @DisplayName("legacy cognito:groups still resolves when no Keycloak role claim is present")
  void shouldKeepLegacyCognitoGroupsFallback() {
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put(CLAIM_IDENTITY_PROVIDER, "bceidbusiness");
    claims.put("cognito:groups", List.of("WASTE_PLUS_SUBMITTER_00010040"));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getGroups(token))
        .containsExactly("WASTE_PLUS_SUBMITTER_00010040");
    assertThat(JwtPrincipalUtil.getRoles(token))
        .containsEntry(Role.SUBMITTER, List.of("00010040"));
    assertThat(JwtPrincipalUtil.getIdentityProvider(token))
        .isEqualTo(IdentityProvider.BUSINESS_BCEID);
  }

  @Test
  @DisplayName("client_roles takes precedence over resource_access and cognito:groups")
  void shouldPreferClientRolesOverOtherSources() {
    Map<String, Object> claims = idirAccessTokenClaims();
    claims.put("azp", "waste-plus");
    claims.put(CLAIM_CLIENT_ROLES, List.of("WASTE_PLUS_ADMIN"));
    claims.put(
        CLAIM_RESOURCE_ACCESS,
        Map.of("waste-plus", Map.of("roles", List.of("WASTE_PLUS_VIEWER_00010040"))));
    claims.put("cognito:groups", List.of("WASTE_PLUS_AREA"));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getGroups(token)).containsExactly("WASTE_PLUS_ADMIN");
    assertThat(JwtPrincipalUtil.getRoles(token)).containsOnlyKeys(Role.ADMIN);
  }

  @Test
  @DisplayName("resource_access takes precedence over cognito:groups")
  void shouldPreferResourceAccessOverCognitoGroups() {
    Map<String, Object> claims = idirAccessTokenClaims();
    claims.put("azp", "waste-plus");
    claims.put(
        CLAIM_RESOURCE_ACCESS,
        Map.of("waste-plus", Map.of("roles", List.of("WASTE_PLUS_AREA"))));
    claims.put("cognito:groups", List.of("WASTE_PLUS_VIEWER_00010040"));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getGroups(token)).containsExactly("WASTE_PLUS_AREA");
    assertThat(JwtPrincipalUtil.getRoles(token)).containsOnlyKeys(Role.AREA);
  }

  @Test
  @DisplayName("FAM expiry bookkeeping entries never resolve as roles")
  void shouldIgnoreFamExpiryBookkeepingEntries() {
    Map<String, Object> claims = bceidAccessTokenClaims();
    claims.put(
        CLAIM_CLIENT_ROLES,
        List.of(
            "WASTE_PLUS_VIEWER_00001271", "FAM:EXPIRES:2026-09-30:WASTE_PLUS_ADMIN"));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getGroups(token)).containsExactly("WASTE_PLUS_VIEWER_00001271");
    assertThat(JwtPrincipalUtil.getRoles(token)).containsOnlyKeys(Role.VIEWER);
  }

  @Test
  @DisplayName("a token with no role claim resolves no roles")
  void shouldReturnEmptyRolesWhenNoClaimIsPresent() {
    Jwt token = jwt(bceidAccessTokenClaims());

    assertThat(JwtPrincipalUtil.getGroups(token)).isEmpty();
    assertThat(JwtPrincipalUtil.getRoles(token)).isEmpty();
    assertThat(JwtPrincipalUtil.getClientFromRoles(token)).isEmpty();
  }

  @ParameterizedTest(name = "identity_provider {0} resolves to {1}")
  @CsvSource({
    "azureidir, IDIR",
    "AzureIDIR, IDIR",
    "idir, IDIR",
    "IDIR, IDIR",
    "bceidbusiness, BUSINESS_BCEID",
    "BCEIDBUSINESS, BUSINESS_BCEID"
  })
  @DisplayName("CSS identity_provider aliases resolve to the expected IdentityProvider")
  void shouldResolveCssIdentityProviderAliases(String claimValue, String expected) {
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put(CLAIM_IDENTITY_PROVIDER, claimValue);
    Jwt token = jwt(claims);
    IdentityProvider expectedProvider = IdentityProvider.valueOf(expected);

    assertThat(JwtPrincipalUtil.getIdentityProvider(token)).isEqualTo(expectedProvider);
    assertThat(JwtPrincipalUtil.getIdentityProvider(new JwtAuthenticationToken(token, List.of())))
        .isEqualTo(expectedProvider);
  }

  @ParameterizedTest(name = "{0} resolves to role {1} for client {2}")
  @CsvSource({
    "WASTE_PLUS_SUBMITTER_FOREST_CLIENT-00001271, SUBMITTER, 00001271",
    "WASTE_PLUS_VIEWER_00001271, VIEWER, 00001271",
    "WASTE_PLUS_SUBMITTER_forest_client-00001271, SUBMITTER, 00001271",
    "WASTE_PLUS_VIEWER_FOREST_CLIENT_00001271, VIEWER, 00001271"
  })
  @DisplayName("FAM and legacy client-scoped role suffixes resolve to the same client number")
  void shouldParseFamAndLegacyClientScopes(
      String roleName, String expectedRoleName, String expectedClient) {
    Map<String, Object> claims = bceidAccessTokenClaims();
    claims.put(CLAIM_CLIENT_ROLES, List.of(roleName));
    Jwt token = jwt(claims);
    Role expectedRole = Role.valueOf(expectedRoleName);

    assertThat(JwtPrincipalUtil.getRoles(token))
        .containsEntry(expectedRole, List.of(expectedClient));
    assertThat(JwtPrincipalUtil.getClientFromRoles(token)).containsExactly(expectedClient);
    assertThat(JwtPrincipalUtil.hasAbstractRole(token, expectedRole, expectedClient)).isTrue();
  }

  @Test
  @DisplayName("malformed FAM client scopes produce no client number")
  void shouldNotInventClientFromMalformedFamScope() {
    Map<String, Object> claims = bceidAccessTokenClaims();
    claims.put(
        CLAIM_CLIENT_ROLES,
        List.of(
            "WASTE_PLUS_SUBMITTER_FOREST_CLIENT-",
            "WASTE_PLUS_VIEWER_FOREST_CLIENT-NOT_A_NUMBER",
            "WASTE_PLUS_SUBMITTER_FOREST_CLIENT",
            "WASTE_PLUS_VIEWER_FOREST_CLIENT-00001271-extra"));
    Jwt token = jwt(claims);

    assertThat(JwtPrincipalUtil.getClientFromRoles(token)).isEmpty();
    assertThat(JwtPrincipalUtil.getRoles(token)).containsOnlyKeys(Role.SUBMITTER, Role.VIEWER);
  }

  private static Map<String, Object> bceidAccessTokenClaims() {
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put("sub", "bceid-subject");
    claims.put(CLAIM_IDENTITY_PROVIDER, "bceidbusiness");
    return claims;
  }
}
