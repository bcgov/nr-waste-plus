package ca.bc.gov.nrs.hrs.util;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Utility methods to identify the running environment of the application.
 *
 * <p>
 * Used to determine whether the application is running in a local
 * environment (for example to relax Content-Security-Policy directives).
 * </p>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SecurityEnvironmentUtil {
  private static final String LOCAL_ENVIRONMENT = "local";

  /**
   * Return true when the provided environment string indicates a local
   * environment (case-insensitive comparison against "local").
   *
   * @param environment environment string to test
   * @return true when the environment equals "local"
   */
  public static boolean isLocalEnvironment(String environment) {
    return LOCAL_ENVIRONMENT.equalsIgnoreCase(environment);
  }
}
