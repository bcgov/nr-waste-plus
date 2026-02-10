package ca.bc.gov.nrs.hrs.dto.base;

import java.util.Arrays;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Enumeration of the identity providers our application works with.
 *
 * <p>Each enum constant holds the claim name as it appears in the JWT so the
 * application can map incoming tokens to one of the supported providers.
 * </p>
 */
@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public enum IdentityProvider {
  IDIR("idir"),
  BUSINESS_BCEID("bceidbusiness"),
  BCEID("bceid"),
  BCSC("bcsc");

  @Getter
  private final String claimName;

  /**
   * Extract the identity provider from a claim value.
   *
   * @param provider the provider claim value (may be null)
   * @return the matching {@link IdentityProvider} wrapped in {@link Optional},
   *     or {@link Optional#empty()} if no match is found
   */
  public static Optional<IdentityProvider> fromClaim(String provider) {
    return Arrays.stream(values())
        .filter(enumValue -> enumValue.claimName.equalsIgnoreCase(provider))
        .findFirst();
  }
}
