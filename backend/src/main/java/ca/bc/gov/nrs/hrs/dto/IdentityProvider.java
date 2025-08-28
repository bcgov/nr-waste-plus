package ca.bc.gov.nrs.hrs.dto;

import java.util.Arrays;
import java.util.Optional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

/** Enumeration of the identity providers our application works with. */
@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public enum IdentityProvider {
  IDIR("idir"),
  BUSINESS_BCEID("bceidbusiness"),
  BCSC("bcsc");

  private final String claimName;

  /**
   * Extract the identity provider from a Jwt.
   *
   * @param provider The provider name
   * @return the identity provider, if one is found
   */
  public static Optional<IdentityProvider> fromClaim(String provider) {
    return Arrays.stream(values())
        .filter(enumValue -> enumValue.claimName.equalsIgnoreCase(provider))
        .findFirst();
  }
}
