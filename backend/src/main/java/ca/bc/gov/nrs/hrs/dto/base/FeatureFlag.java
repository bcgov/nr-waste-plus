package ca.bc.gov.nrs.hrs.dto.base;

import lombok.Getter;

/**
 * Known feature flag keys for compile-time discoverability.
 *
 * <p>Use constants from this enum with
 * {@link ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration#isEnabled(FeatureFlag)}
 * to avoid free-form string access and reduce the risk of silent typos in flag names.
 *
 * <p>Naming convention: enum constant names use {@code SCREAMING_SNAKE_CASE}; the
 * corresponding YAML key uses the canonical {@code <domain>-<capability>-enabled}
 * format defined in the cross-stack naming contract.
 *
 * <h2>Adding a new flag</h2>
 *
 * <ol>
 *   <li>Add an entry here: {@code DOMAIN_CAPABILITY_ENABLED("domain-capability-enabled")}.</li>
 *   <li>Declare the flag in {@code application.yml} under {@code features.flags}.</li>
 *   <li>Update the Flag Registry in the architecture wiki.</li>
 * </ol>
 *
 * <h2>Retiring a flag</h2>
 *
 * <ol>
 *   <li>Mark the constant for retirement in its Javadoc and include a target removal release.</li>
 *   <li>Remove the constant once all production callers have been migrated and
 *       the flag has been removed from all environment configurations.</li>
 * </ol>
 *
 * @since 1.0.0
 */
@Getter
public enum FeatureFlag {

  OFFLINE_MODE_ENABLED("offline-mode-enabled"),

  /**
   * Controls whether hydrated user identity attributes are persisted locally.
   *
   * <p>When disabled, the application still calls Cognito {@code /oauth2/userInfo}
   * for request-time hydration but does not write/read identity data from the database.
   * This allows privacy-first rollout while keeping the hydration pipeline active.</p>
   */
  USER_IDENTITY_PERSISTENCE_ENABLED("user-identity-persistence-enabled"),

  /**
   * Controls whether the reporting unit bookmark feature is enabled.
   * <p>When enabled, users can bookmark a reporting unit, and see their bookmarked values as
   * part of the search result</p>
   */
  BOOKMARK_REPORTING_UNIT_ENABLED("bookmark-ru-enabled"),

  /**
   * Controls whether the Reporting Unit details endpoint is available.
   *
   * <p>When enabled, {@code GET /api/reporting-units/{id}} is accessible and returns the
   * full details of a reporting unit aggregated from the legacy API and Forest Client API.
   * When disabled, the endpoint returns HTTP 404 so the feature is invisible to callers.</p>
   */
  REPORTING_UNIT_DETAILS_ENABLED("reporting-unit-details-enabled");

  private final String key;

  FeatureFlag(String key) {
    this.key = key;
  }
}
