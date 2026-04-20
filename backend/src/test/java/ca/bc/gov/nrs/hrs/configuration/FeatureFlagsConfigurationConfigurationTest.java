package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.core.env.Environment;

@DisplayName("Unit Test | FeatureFlagsConfiguration")
class FeatureFlagsConfigurationTest {

  private static final String FEATURE_NAME = "my-feature";

  private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();

  @AfterEach
  void tearDown() {
    meterRegistry.clear();
  }

  @Test
  @DisplayName("should return true for an enabled flag")
  void shouldReturnTrueForEnabledFlag() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder()
        .flags(Map.of(FEATURE_NAME, true))
        .build();

    assertThat(featureFlags.isEnabled(FEATURE_NAME)).isTrue();
  }

  @Test
  @DisplayName("should return false for a disabled flag")
  void shouldReturnFalseForDisabledFlag() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder()
        .flags(Map.of(FEATURE_NAME, false))
        .build();

    assertThat(featureFlags.isEnabled(FEATURE_NAME)).isFalse();
  }

  @Test
  @DisplayName("should return false for a non-existent flag")
  void shouldReturnFalseForNonExistentFlag() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder()
        .flags(Map.of())
        .build();

    assertThat(featureFlags.isEnabled("missing-flag")).isFalse();
  }

  @Test
  @DisplayName("should return false when flags map is empty by default")
  void shouldReturnFalseWhenDefaultBuilder() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder().build();

    assertThat(featureFlags.isEnabled("anything")).isFalse();
  }

  @Test
  @DisplayName("should record evaluation metric with value=true tag")
  void shouldRecordEvaluationMetricForEnabledFlag() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder()
        .flags(Map.of(FEATURE_NAME, true))
        .build();
    ReflectionTestUtils.setField(featureFlags, "meterRegistry", meterRegistry);

    boolean enabled = featureFlags.isEnabled(FEATURE_NAME);

    assertThat(enabled).isTrue();
    assertThat(meterRegistry.get("hrs.feature.flag.evaluations")
      .tag("flag", FEATURE_NAME)
        .tag("value", "true")
        .counter()
        .count()).isEqualTo(1.0);
  }

  @Test
  @DisplayName("should record evaluation metric with value=false tag")
  void shouldRecordEvaluationMetricForDisabledFlag() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder()
        .flags(Map.of(FEATURE_NAME, false))
        .build();
    ReflectionTestUtils.setField(featureFlags, "meterRegistry", meterRegistry);

    boolean enabled = featureFlags.isEnabled(FEATURE_NAME);

    assertThat(enabled).isFalse();
    assertThat(meterRegistry.get("hrs.feature.flag.evaluations")
      .tag("flag", FEATURE_NAME)
        .tag("value", "false")
        .counter()
        .count()).isEqualTo(1.0);
  }

  @Test
  @DisplayName("should detect production profile when prod is active")
  void shouldDetectProductionProfile() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder().build();
    Environment environment = mock(Environment.class);
    when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
    ReflectionTestUtils.setField(featureFlags, "environment", environment);

    boolean production = ReflectionTestUtils.invokeMethod(featureFlags, "isProductionProfileActive");

    assertThat(production).isTrue();
  }
}
