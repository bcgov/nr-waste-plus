package ca.bc.gov.nrs.hrs.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | CodesProperties")
class CodesPropertiesTest {

  @Test
  @DisplayName("default harvestStatusVariants is empty and mutable via setter")
  void defaultsAndSetters_shouldWork() {
    CodesProperties properties = new CodesProperties();

    assertThat(properties.getHarvestStatusVariants()).isEmpty();

    Map<String, List<String>> variants = Map.of("INTERIOR", List.of("COM", "INC"));
    properties.setHarvestStatusVariants(variants);

    assertThat(properties.getHarvestStatusVariants())
        .containsExactlyEntriesOf(variants);
  }

  @Test
  @DisplayName("all-args constructor sets harvestStatusVariants")
  void allArgsConstructor_shouldSetValues() {
    Map<String, List<String>> variants = Map.of("COASTAL", List.of("COM", "INC", "NOA"));

    CodesProperties properties = new CodesProperties(variants);

    assertThat(properties.getHarvestStatusVariants()).isEqualTo(variants);
  }
}
