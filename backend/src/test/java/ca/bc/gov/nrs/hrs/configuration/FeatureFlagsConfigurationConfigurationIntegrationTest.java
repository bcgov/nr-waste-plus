package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("Integrated Test | FeatureFlagsConfiguration")
class FeatureFlagsConfigurationIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private FeatureFlagsConfiguration featureFlagsConfiguration;

  @Test
  @DisplayName("should load enabled flag from application-default.yml")
  void shouldLoadEnabledFlag() {
    assertThat(featureFlagsConfiguration.isEnabled("enabled-flag")).isTrue();
  }

  @Test
  @DisplayName("should load disabled flag from application-default.yml")
  void shouldLoadDisabledFlag() {
    assertThat(featureFlagsConfiguration.isEnabled("disabled-flag")).isFalse();
  }

  @Test
  @DisplayName("should return false for a flag not defined in configuration")
  void shouldReturnFalseForUndefinedFlag() {
    assertThat(featureFlagsConfiguration.isEnabled("non-existent-flag")).isFalse();
  }
}

