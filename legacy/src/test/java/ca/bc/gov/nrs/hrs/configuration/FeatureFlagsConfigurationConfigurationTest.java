package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("Unit Test | FeatureFlagsConfiguration")
class FeatureFlagsConfigurationTest {

  private static final String FEATURE_NAME = "my-feature";
  private static final String METRIC_NAME = "hrs.feature.flag.evaluations";

  private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();

  @AfterEach
  void tearDown() {
    meterRegistry.clear();
  }

  @Test
  @DisplayName("should return true for an enabled flag")
  void shouldReturnTrueForEnabledFlag() {
    FeatureFlagsConfiguration featureFlags =
        FeatureFlagsConfiguration.builder()
            .flags(Map.of(FEATURE_NAME, true))
            .build();

    assertThat(featureFlags.isEnabled(FEATURE_NAME)).isTrue();
  }

  @Test
  @DisplayName("should return false for a disabled flag")
  void shouldReturnFalseForDisabledFlag() {
    FeatureFlagsConfiguration featureFlags =
        FeatureFlagsConfiguration.builder()
            .flags(Map.of(FEATURE_NAME, false))
            .build();

    assertThat(featureFlags.isEnabled(FEATURE_NAME)).isFalse();
  }

  @Test
  @DisplayName("should return false for a non-existent flag")
  void shouldReturnFalseForNonExistentFlag() {
    FeatureFlagsConfiguration featureFlags =
        FeatureFlagsConfiguration.builder()
            .flags(Map.of())
            .build();

    assertThat(featureFlags.isEnabled("missing-flag")).isFalse();
  }

  @Test
  @DisplayName("should return false when no flags are configured")
  void shouldReturnFalseByDefault() {
    FeatureFlagsConfiguration featureFlags =
        FeatureFlagsConfiguration.builder()
            .build();

    assertThat(featureFlags.isEnabled("anything")).isFalse();
  }

  @Test
  @DisplayName("should record metric with value=true tag when flag is enabled")
  void shouldRecordMetricForEnabledFlag() {
    FeatureFlagsConfiguration featureFlags = flagsWith(FEATURE_NAME, true);

    featureFlags.isEnabled(FEATURE_NAME);

    assertThat(counterCount(FEATURE_NAME, "true")).isEqualTo(1.0);
  }

  @Test
  @DisplayName("should record metric with value=false tag when flag is disabled")
  void shouldRecordMetricForDisabledFlag() {
    FeatureFlagsConfiguration featureFlags = flagsWith(FEATURE_NAME, false);

    featureFlags.isEnabled(FEATURE_NAME);

    assertThat(counterCount(FEATURE_NAME, "false")).isEqualTo(1.0);
  }

  @Test
  @DisplayName("should increment counter on each evaluation")
  void shouldIncrementCounterOnRepeatedEvaluations() {
    FeatureFlagsConfiguration featureFlags = flagsWith(FEATURE_NAME, true);

    featureFlags.isEnabled(FEATURE_NAME);
    featureFlags.isEnabled(FEATURE_NAME);
    featureFlags.isEnabled(FEATURE_NAME);

    assertThat(counterCount(FEATURE_NAME, "true")).isEqualTo(3.0);
  }

  @Test
  @DisplayName("should detect production profile when prod is the only active profile")
  void shouldDetectProductionProfileAlone() {
    assertProductionDetectedWith(new String[]{"prod"}, true);
  }

  @Test
  @DisplayName("should detect production profile when prod is among other active profiles")
  void shouldDetectProductionProfileAlongOthers() {
    assertProductionDetectedWith(new String[]{"prod", "debug"}, true);
  }

  @Test
  @DisplayName("should not detect production profile when no profiles are active")
  void shouldNotDetectProductionProfileWhenEmpty() {
    assertProductionDetectedWith(new String[]{}, false);
  }

  @Test
  @DisplayName("should not detect production profile for non-prod profiles")
  void shouldNotDetectProductionProfileForOtherProfiles() {
    assertProductionDetectedWith(new String[]{"dev", "staging"}, false);
  }

  @Test
  @DisplayName("should treat 'production' as a valid production profile")
  void shouldMatchProductionProfileName() {
    assertProductionDetectedWith(new String[]{"production"}, true);
  }

  /**
   * Builds a configuration with the given single flag and injects the shared
   * test meter registry so counter assertions work out of the box.
   */
  private FeatureFlagsConfiguration flagsWith(String name, boolean value) {
    FeatureFlagsConfiguration featureFlags =
        Objects.requireNonNull(
            FeatureFlagsConfiguration.builder()
                .flags(Map.of(name, value))
                .build());

    ReflectionTestUtils.setField(featureFlags, "meterRegistry", meterRegistry);
    return featureFlags;
  }

  private double counterCount(String flagName, String value) {
    return meterRegistry
        .get(METRIC_NAME)
        .tag("flag", flagName)
        .tag("value", value)
        .counter()
        .count();
  }

  private void assertProductionDetectedWith(String[] profiles, boolean expected) {
    FeatureFlagsConfiguration featureFlags =
        Objects.requireNonNull(
            FeatureFlagsConfiguration.builder()
                .build());

    Environment env = mock(Environment.class);
    when(env.getActiveProfiles()).thenReturn(profiles);

    ReflectionTestUtils.setField(featureFlags, "environment", env);

    Boolean result =
        ReflectionTestUtils.invokeMethod(
            featureFlags, "isProductionProfileActive");

    assertThat(result).isEqualTo(expected);
  }
}