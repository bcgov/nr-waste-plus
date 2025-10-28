package ca.bc.gov.nrs.hrs;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Application-wide legacy constants used for SQL parameter placeholders and sentinel values.
 *
 * <p>The values in this class represent special token values used across the codebase to
 * indicate an absent or unspecified value (for example when binding query parameters) and a
 * placeholder client identifier used when no client is available.</p>
 *
 * <p>This class is not instantiable and only exposes static constant values.</p>
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class LegacyConstants {

  /**
   * Token representing a missing or unspecified value when interacting with legacy queries.
   *
   * <p>Used in SQL where clauses and parameter binding to indicate the absence of a filter
   * value.</p>
   */
  public static final String NOVALUE = "NOVALUE";

  /**
   * Token representing the absence of a client value.
   *
   * <p>Used as a fallback client identifier in places where a client list is required but
   * none are available.</p>
   */
  public static final String NOCLIENT = "NOCLIENT";
}
