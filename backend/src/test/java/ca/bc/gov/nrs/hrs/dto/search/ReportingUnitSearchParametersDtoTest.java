package ca.bc.gov.nrs.hrs.dto.search;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

@DisplayName("Unit Test | ReportingUnitSearchParametersDto")
class ReportingUnitSearchParametersDtoTest {

  @Test
  @DisplayName("isEmpty should return false when bookmarked is true")
  void isEmpty_bookmarkedTrue_shouldReturnFalse() {
    var dto = ReportingUnitSearchParametersDto.builder()
        .bookmarked(true)
        .build();

    assertThat(dto.isEmpty()).isFalse();
  }

  @Test
  @DisplayName("isEmpty should return true when all fields are empty/default")
  void isEmpty_allDefaults_shouldReturnTrue() {
    var dto = ReportingUnitSearchParametersDto.builder().build();

    assertThat(dto.isEmpty()).isTrue();
  }

  @Test
  @DisplayName("toMultiMap should include reportingUnitIds when set")
  void toMultiMap_withReportingUnitIds_shouldIncludeThem() {
    var dto = ReportingUnitSearchParametersDto.builder()
        .reportingUnitIds(List.of(100L, 200L, 300L))
        .build();

    var multiMap = dto.toMultiMap(PageRequest.of(0, 10));

    assertThat(multiMap.get("reportingUnitIds"))
        .containsExactly("100", "200", "300");
  }

  @Test
  @DisplayName("toMultiMap should not include reportingUnitIds when null")
  void toMultiMap_withNullReportingUnitIds_shouldNotInclude() {
    var dto = ReportingUnitSearchParametersDto.builder().build();

    var multiMap = dto.toMultiMap(PageRequest.of(0, 10));

    assertThat(multiMap.get("reportingUnitIds")).isNull();
  }

  @Test
  @DisplayName("toMultiMap should not include reportingUnitIds when empty")
  void toMultiMap_withEmptyReportingUnitIds_shouldNotInclude() {
    var dto = ReportingUnitSearchParametersDto.builder()
        .reportingUnitIds(List.of())
        .build();

    var multiMap = dto.toMultiMap(PageRequest.of(0, 10));

    assertThat(multiMap.get("reportingUnitIds")).isNull();
  }
}

