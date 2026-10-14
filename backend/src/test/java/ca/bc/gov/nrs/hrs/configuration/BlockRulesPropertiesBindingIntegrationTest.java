package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@SpringBootTest(
    classes = {BlockRulesProperties.class, BlockRulesPropertiesBindingIntegrationTest.TestConfig.class},
    properties = {
      "ca.bc.gov.nrs.block-rules.sampling.AVG.max-blocks=1",
      "ca.bc.gov.nrs.block-rules.sampling.AVG.block-type=DISTRICT_AVERAGE",
      "ca.bc.gov.nrs.block-rules.sampling.XYZ.max-blocks=7",
      "ca.bc.gov.nrs.block-rules.sampling.XYZ.block-type=CUSTOM"
    })
@ActiveProfiles("test")
@DisplayName("Integration Test | Block rules configuration binding")
class BlockRulesPropertiesBindingIntegrationTest {

  @Autowired private BlockRulesProperties blockRulesProperties;

  @Test
  @DisplayName("shouldBindEachSamplingRule_andPreserveConfiguredValues")
  void shouldBindEachSamplingRule_andPreserveConfiguredValues() {
    assertThat(blockRulesProperties.getSampling())
        .containsOnlyKeys("AVG", "XYZ")
        .containsEntry(
            "AVG", new BlockRulesProperties.SamplingBlockRule(1, "DISTRICT_AVERAGE"))
        .containsEntry("XYZ", new BlockRulesProperties.SamplingBlockRule(7, "CUSTOM"));
  }

  @Configuration
  @EnableConfigurationProperties(BlockRulesProperties.class)
  static class TestConfig {}
}
