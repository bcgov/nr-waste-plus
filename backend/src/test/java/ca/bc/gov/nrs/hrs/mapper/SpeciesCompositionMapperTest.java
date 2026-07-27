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
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Species Composition Mapper")
class SpeciesCompositionMapperTest {

  private static final String[] SPECIES_KEYS = {
      "AL", "AR", "AS", "BA", "BI", "CE", "CO", "CY", "FI",
      "HE", "LA", "LO", "MA", "SP", "UU", "WB", "WH", "WI", "YE"
  };

  private SpeciesCompositionRow buildRow(String code, String description) {
    java.util.LinkedHashMap<String, BigDecimal> species = new java.util.LinkedHashMap<>();
    species.put("AL", new BigDecimal("1.1"));
    species.put("AR", new BigDecimal("2.2"));
    species.put("AS", new BigDecimal("3.3"));
    species.put("BA", new BigDecimal("4.4"));
    species.put("BI", new BigDecimal("5.5"));
    species.put("CE", new BigDecimal("6.6"));
    species.put("CO", new BigDecimal("7.7"));
    species.put("CY", new BigDecimal("8.8"));
    species.put("FI", new BigDecimal("9.9"));
    species.put("HE", new BigDecimal("10.1"));
    species.put("LA", new BigDecimal("11.1"));
    species.put("LO", new BigDecimal("12.1"));
    species.put("MA", new BigDecimal("13.1"));
    species.put("SP", new BigDecimal("14.1"));
    species.put("UU", new BigDecimal("15.1"));
    species.put("WB", new BigDecimal("16.1"));
    species.put("WH", new BigDecimal("17.1"));
    species.put("WI", new BigDecimal("18.1"));
    species.put("YE", new BigDecimal("100.0"));
    return new SpeciesCompositionRow(
        new CodeDescriptionDto(code, description),
        species
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
    assertThat(result.rows().get(0).species().get("AL")).isEqualByComparingTo(new BigDecimal("1.100"));
    assertThat(result.rows().get(0).species().get("YE")).isEqualByComparingTo(new BigDecimal("100.000"));
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
    assertThat(mapped.species().get("CE")).isEqualByComparingTo(new BigDecimal("6.600"));
    assertThat(mapped.species().get("UU")).isEqualByComparingTo(new BigDecimal("15.100"));
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
    assertThat(result.speciesRows().get(0).species().get("FI")).isEqualByComparingTo(new BigDecimal("9.900"));
    assertThat(result.formulas()).isEqualTo(Map.of());
  }

  @Test
  @DisplayName("scaleRow (via toSpeciesDataDto) — should preserve empty species map instead of scaling them")
  void toSpeciesDataDto_preservesEmptyMap_whenSpeciesMapIsEmpty() {

    SpeciesCompositionRow row = new SpeciesCompositionRow(
        new CodeDescriptionDto("DND", "Nadina Natural Resource District"),
        Map.of()
    );

    TableData tableData = new TableData(null, null, List.of(row), Map.of());

    SpeciesCompositionDataDto result = SpeciesCompositionMapper.toSpeciesDataDto(tableData);

    SpeciesCompositionRow mapped = result.rows().get(0);
    assertThat(mapped.species()).isEmpty();
    assertThat(mapped.district().code()).isEqualTo("DND");
  }
}