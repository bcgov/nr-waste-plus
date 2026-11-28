package ca.bc.gov.nrs.hrs.util;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Keycloak-shaped JWT fixtures for the Cognito-to-BC Gov SSO migration contract tests (epic #1506).
 *
 * <p>Claim names and values mirror what the BC Gov SSO Keycloak standard realm puts on an IDIR
 * access token. Per plan decision D-006 the claim-mapping tests are written before the mapping
 * code exists, so these fixtures are the executable specification of the target contract: {@code
 * identity_provider} replaces {@code custom:idp_name}, {@code idir_username} / {@code
 * idir_user_guid} replace {@code custom:idp_username} / {@code custom:idp_user_id}, and roles
 * arrive in {@code client_roles} (CSS-era FAM) or {@code resource_access.<azp>.roles} (stock
 * Keycloak).</p>
 */
public final class KeycloakJwtFixtures {

  /** Claim that names the identity provider in Keycloak tokens (replaces {@code custom:idp_name}). */
  public static final String CLAIM_IDENTITY_PROVIDER = "identity_provider";

  /** Claim carrying the IDIR username as issued by the identity provider. */
  public static final String CLAIM_IDIR_USERNAME = "idir_username";

  /** Claim carrying the IDIR user GUID. */
  public static final String CLAIM_IDIR_USER_GUID = "idir_user_guid";

  /** Claim carrying the CSS-era FAM client roles (primary source of authorities). */
  public static final String CLAIM_CLIENT_ROLES = "client_roles";

  /** Claim carrying stock-Keycloak client roles (fallback source of authorities). */
  public static final String CLAIM_RESOURCE_ACCESS = "resource_access";

  /** IDIR user GUID exactly as the Keycloak standard realm issues it (uppercase). */
  public static final String IDIR_GUID_ISSUED = "B5ECDB09F3A24C6E8D1B0A9C7E5F3D21";

  /** The same GUID as embedded in {@code preferred_username} (lowercase). */
  public static final String IDIR_GUID_EMBEDDED = "b5ecdb09f3a24c6e8d1b0a9c7e5f3d21";

  /** IDIR username in the exact case the identity provider issues it. */
  public static final String IDIR_USERNAME_ISSUED = "jryan";

  /** Keycloak internal subject, distinct from the IDIR username and the GUID. */
  public static final String KEYCLOAK_SUBJECT = "f2a1c3e5-4b6d-4a8c-9e0f-1a2b3c4d5e6f";

  private KeycloakJwtFixtures() {}

  /**
   * Base claims of a Keycloak standard-realm IDIR access token, as a fresh mutable map so tests can
   * derive variants (case flips, dropped claims) without affecting other tests.
   *
   * <p>The GUID appears twice in the same token with different cases — uppercase in {@code
   * idir_user_guid} and lowercase inside {@code preferred_username} — which is the drift the
   * migration must fold away.</p>
   *
   * @return a new mutable claims map of a Keycloak IDIR access token
   */
  public static Map<String, Object> idirAccessTokenClaims() {
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put("sub", KEYCLOAK_SUBJECT);
    claims.put(CLAIM_IDENTITY_PROVIDER, "azureidir");
    claims.put(CLAIM_IDIR_USERNAME, IDIR_USERNAME_ISSUED);
    claims.put(CLAIM_IDIR_USER_GUID, IDIR_GUID_ISSUED);
    claims.put("preferred_username", IDIR_GUID_EMBEDDED + "@azureidir");
    claims.put("display_name", "Ryan, John WLRS:EX");
    return claims;
  }

  /**
   * Builds an unsigned Spring {@link Jwt} from raw claims; no decoder or validator is involved, the
   * claims map is used verbatim.
   *
   * @param claims the claims to expose on the token
   * @return a JWT carrying exactly the supplied claims
   */
  public static Jwt jwt(Map<String, Object> claims) {
    return new Jwt(
        "keycloak-token-value",
        Instant.now().minusSeconds(60),
        Instant.now().plusSeconds(300),
        Map.of("alg", "none", "typ", "JWT"),
        claims);
  }
}
