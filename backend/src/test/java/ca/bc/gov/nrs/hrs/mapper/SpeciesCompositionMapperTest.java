package ca.bc.gov.nrs.hrs.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.speciescomposition.SpeciesCompositionDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Species Composition Mapper")
class SpeciesCompositionMapperTest {

  private SpeciesCompositionRow buildRow(String code, String description) {
    return new SpeciesCompositionRow(
        new CodeDescriptionDto(code, description),
        new BigDecimal("1.1"),
        new BigDecimal("2.2"),
        new BigDecimal("3.3"),
        new BigDecimal("4.4"),
        new BigDecimal("5.5"),
        new BigDecimal("6.6"),
        new BigDecimal("7.7"),
        new BigDecimal("8.8"),
        new BigDecimal("9.9"),
        new BigDecimal("10.1"),
        new BigDecimal("11.1"),
        new BigDecimal("12.1"),
        new BigDecimal("13.1"),
        new BigDecimal("14.1"),
        new BigDecimal("15.1"),
        new BigDecimal("16.1"),
        new BigDecimal("17.1"),
        new BigDecimal("18.1"),
        new BigDecimal("100.0")
    );
  }

  @Test
  @DisplayName("toDto — should return null when entity is null")
  void toDto_returnsNull_whenEntityIsNull() {
    assertThat(SpeciesCompositionMapper.toDto(null)).isNull();
  }

  @Test
  @DisplayName("toDto — should return mapped DTO with scaled rows when entity has data")
  void toDto_returnsMappedDto_whenEntityHasSpeciesRows() {

    SpeciesCompositionRow row = buildRow("DPG", "Prince George Natural Resource District");

    TableData tableData = new TableData(null, null, List.of(row), Map.of());

    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setId(1L);
    entity.setStartDate(LocalDate.now());
    entity.setDateOfUpload(LocalDateTime.now());
    entity.setTableData(tableData);

    SpeciesCompositionDataDto result = SpeciesCompositionMapper.toDto(entity);

    assertThat(result).isNotNull();
    assertThat(result.rows()).hasSize(1);
    assertThat(result.rows().get(0).district().code()).isEqualTo("DPG");
    assertThat(result.rows().get(0).district().description())
        .isEqualTo("Prince George Natural Resource District");
    assertThat(result.rows().get(0).balsam()).isEqualByComparingTo(new BigDecimal("1.100"));
    assertThat(result.rows().get(0).total()).isEqualByComparingTo(new BigDecimal("100.000"));
  }

  @Test
  @DisplayName("toSpeciesDataDto — should return empty rows when TableData is null")
  void toSpeciesDataDto_returnsEmptyRows_whenTableDataIsNull() {

    SpeciesCompositionDataDto result = SpeciesCompositionMapper.toSpeciesDataDto(null);

    assertThat(result).isNotNull();
    assertThat(result.rows()).isEmpty();
  }

  @Test
  @DisplayName("toSpeciesDataDto — should return empty rows when speciesRows is null")
  void toSpeciesDataDto_returnsEmptyRows_whenSpeciesRowsIsNull() {

    TableData tableData = new TableData(null, null, null, Map.of());

    SpeciesCompositionDataDto result = SpeciesCompositionMapper.toSpeciesDataDto(tableData);

    assertThat(result).isNotNull();
    assertThat(result.rows()).isEmpty();
  }

  @Test
  @DisplayName("toSpeciesDataDto — should scale all BigDecimal fields to 3 decimal places")
  void toSpeciesDataDto_scalesAllFields_whenRowsPresent() {

    SpeciesCompositionRow row = buildRow("DVA", "Vancouver Natural Resource District");
    TableData tableData = new TableData(null, null, List.of(row), Map.of());

    SpeciesCompositionDataDto result = SpeciesCompositionMapper.toSpeciesDataDto(tableData);

    assertThat(result.rows()).hasSize(1);
    SpeciesCompositionRow mapped = result.rows().get(0);
    assertThat(mapped.cedar()).isEqualByComparingTo(new BigDecimal("2.200"));
    assertThat(mapped.unknown()).isEqualByComparingTo(new BigDecimal("18.100"));
  }

  @Test
  @DisplayName("toEntityTableData — should return empty TableData when dto is null")
  void toEntityTableData_returnsEmptyTableData_whenDtoIsNull() {

    TableData result = SpeciesCompositionMapper.toEntityTableData(null);

    assertThat(result).isNotNull();
    assertThat(result.zones()).isNull();
    assertThat(result.sections()).isNull();
    assertThat(result.speciesRows()).isNull();
    assertThat(result.formulas()).isEqualTo(Map.of());
  }

  @Test
  @DisplayName("toEntityTableData — should return empty TableData when dto rows is null")
  void toEntityTableData_returnsEmptyTableData_whenRowsIsNull() {

    SpeciesCompositionDataDto dto = new SpeciesCompositionDataDto(null);

    TableData result = SpeciesCompositionMapper.toEntityTableData(dto);

    assertThat(result.speciesRows()).isNull();
    assertThat(result.formulas()).isEqualTo(Map.of());
  }

  @Test
  @DisplayName("toEntityTableData — should map and scale rows into speciesRows, leaving zones/sections null")
  void toEntityTableData_mapsAndScalesRows_whenDtoHasRows() {

    SpeciesCompositionRow row = buildRow("DKM", "Kamloops Natural Resource District");
    SpeciesCompositionDataDto dto = new SpeciesCompositionDataDto(List.of(row));

    TableData result = SpeciesCompositionMapper.toEntityTableData(dto);

    assertThat(result.zones()).isNull();
    assertThat(result.sections()).isNull();
    assertThat(result.speciesRows()).hasSize(1);
    assertThat(result.speciesRows().get(0).district().code()).isEqualTo("DKM");
    assertThat(result.speciesRows().get(0).district().description())
        .isEqualTo("Kamloops Natural Resource District");
    assertThat(result.speciesRows().get(0).pine()).isEqualByComparingTo(new BigDecimal("9.900"));
    assertThat(result.formulas()).isEqualTo(Map.of());
  }

  @Test
  @DisplayName("scaleRow (via toSpeciesDataDto) — should preserve null values instead of scaling them")
  void toSpeciesDataDto_preservesNulls_whenFieldsAreNull() {

    SpeciesCompositionRow row = new SpeciesCompositionRow(
        new CodeDescriptionDto("DND", "Nadina Natural Resource District"),
        null, null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null
    );

    TableData tableData = new TableData(null, null, List.of(row), Map.of());

    SpeciesCompositionDataDto result = SpeciesCompositionMapper.toSpeciesDataDto(tableData);

    SpeciesCompositionRow mapped = result.rows().get(0);
    assertThat(mapped.balsam()).isNull();
    assertThat(mapped.total()).isNull();
    assertThat(mapped.district().code()).isEqualTo("DND");
  }
}