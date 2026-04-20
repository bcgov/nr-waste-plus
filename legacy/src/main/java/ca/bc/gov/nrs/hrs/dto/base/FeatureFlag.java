package ca.bc.gov.nrs.hrs.dto.base;

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
public enum FeatureFlag {

  OFFLINE_MODE_ENABLED("offline-mode-enabled");

  private final String key;

  FeatureFlag(String key) {
    this.key = key;
  }

  /**
   * Returns the YAML configuration key for this flag.
   *
   * <p>This is the string used as the key under {@code features.flags} in
   * {@code application.yml}, and must match the canonical cross-stack key
   * format {@code <domain>-<capability>-enabled}.
   *
   * @return the configuration key string
   */
  public String getKey() {
    return key;
  }
}
