package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test  FeatureFlagsConfiguration")
class FeatureFlagsConfigurationConfigurationTest {

  @Test
  @DisplayName("should return true for an enabled flag")
  void shouldReturnTrueForEnabledFlag() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder()
        .flags(Map.of("my-feature", true))
        .build();

    assertThat(featureFlags.isEnabled("my-feature")).isTrue();
  }

  @Test
  @DisplayName("should return false for a disabled flag")
  void shouldReturnFalseForDisabledFlag() {
    FeatureFlagsConfiguration featureFlags = FeatureFlagsConfiguration.builder()
        .flags(Map.of("my-feature", false))
        .build();

    assertThat(featureFlags.isEnabled("my-feature")).isFalse();
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
}

