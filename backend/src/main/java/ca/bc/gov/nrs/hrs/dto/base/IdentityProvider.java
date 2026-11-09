package ca.bc.gov.nrs.hrs.dto.base;

import java.util.Arrays;
import java.util.Optional;
import lombok.Getter;

/**
 * Enumeration of the identity providers our application works with.
 *
 * <p>Each enum constant holds the claim name as it appears in the JWT so the application can map
 * incoming tokens to one of the supported providers.
 */
public enum IdentityProvider {
  /**
   * BC Government IDIR. Keycloak standard-realm tokens carry {@code azureidir} (the Azure AD-backed
   * IDIR broker) or {@code idir}; both aliases resolve here.
   */
  IDIR("idir", "azureidir"),
  BUSINESS_BCEID("bceidbusiness"),
  BCSC("bcsc");

  @Getter
  private final String claimName;

  /** Alternative claim values that resolve to this provider (for example Keycloak broker names). */
  private final String[] aliases;

  IdentityProvider(String claimName, String... aliases) {
    this.claimName = claimName;
    this.aliases = aliases;
  }

  /**
   * Extract the identity provider from a claim value.
   *
   * @param provider the provider claim value (may be null)
   * @return the matching {@link IdentityProvider} wrapped in {@link Optional}, or {@link
   *     Optional#empty()} if no match is found
   */
  public static Optional<IdentityProvider> fromClaim(String provider) {
    return Arrays.stream(values())
        .filter(
            enumValue ->
                enumValue.claimName.equalsIgnoreCase(provider)
                    || Arrays.stream(enumValue.aliases)
                        .anyMatch(alias -> alias.equalsIgnoreCase(provider)))
        .findFirst();
  }
}
