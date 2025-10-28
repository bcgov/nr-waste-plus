package ca.bc.gov.nrs.hrs.util;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Utility for security-related environment checks.
 *
 * <p>Currently contains a small helper to detect a local environment name. The method is
 * case-insensitive and intended for conditional behavior in environment-specific code paths.</p>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SecurityEnvironmentUtil {
  private static final String LOCAL_ENVIRONMENT = "local";

  /**
   * Return true when the supplied environment name represents a local environment.
   *
   * @param environment the environment name to test (may be null)
   * @return true when {@code environment} equals "local" ignoring case
   */
  public static boolean isLocalEnvironment(String environment) {
    return LOCAL_ENVIRONMENT.equalsIgnoreCase(environment);
  }
}
