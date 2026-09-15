package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaVariablesResponse;
import ca.bc.gov.nrs.hrs.dto.formula.VariableNodeDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictRow;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Section;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Zone;
import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Formula Variable Service")
class FormulaVariableServiceTest {

  private static final LocalDate DATE = LocalDate.of(2026, 11, 3);

  @Mock
  private DistrictVolumeRepository districtVolumeRepository;
  @InjectMocks
  private FormulaVariableService service;

  @DisplayName("Builds complete response for INTERIOR area")
  @Test
  void buildsCompleteResponseForInterior() {
    DistrictRow dr = row("DCC", new BigDecimal("11.530"), new BigDecimal("10.000"));
    Zone zone = new Zone("Mature", List.of(dr));
    TableData dvData = new TableData(List.of(zone), null, null, Map.of());
    DistrictVolumeEntity dvEntity = dvEntity(Area.INTERIOR, dvData);

    SpeciesCompositionRow scRow = new SpeciesCompositionRow(
        new CodeDescriptionDto("DCC", "DCC"),
        Map.of("AL", new BigDecimal("0.000"), "BA", new BigDecimal("5.500")));
    TableData scData = new TableData(null, null, List.of(scRow), Map.of());
    DistrictVolumeEntity scEntity = scEntity(Area.INTERIOR, scData);

    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.DISTRICT_VOLUME, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.of(dvEntity));
    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.SPECIES_COMPOSITION, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.of(scEntity));

    FormulaVariablesResponse response = service.build(DATE, Area.INTERIOR);

    assertThat(response.effectiveDate()).isEqualTo(DATE);
    assertThat(response.area()).isEqualTo(Area.INTERIOR);
    assertThat(response.namespaces()).containsKeys("da", "sc");

    VariableNodeDto daNode = response.namespaces().get("da");
    assertThat(daNode.type()).isEqualTo("object");
    assertThat(daNode.children()).containsKey("mature");

    VariableNodeDto matureNode = daNode.children().get("mature");
    assertThat(matureNode.type()).isEqualTo("object");
    assertThat(matureNode.children()).containsKey("avoidableGradeY");

    VariableNodeDto gradeY = matureNode.children().get("avoidableGradeY");
    assertThat(gradeY.type()).isEqualTo("number");
    assertThat(gradeY.path()).isEqualTo("da.mature.avoidableGradeY");
    assertThat(gradeY.value()).isEqualByComparingTo("10.000");
    assertThat(gradeY.label()).isEqualTo("Avoidable Grade Y");

    VariableNodeDto scNode = response.namespaces().get("sc");
    assertThat(scNode.children()).containsKey("AL");
    assertThat(scNode.children().get("AL").path()).isEqualTo("sc.AL");

    assertThat(response.flat()).containsEntry(
        "da.mature.avoidableGradeY", new BigDecimal("10.000"));
    assertThat(response.flat()).containsEntry("sc.AL", new BigDecimal("0.000"));
    assertThat(response.flat()).containsEntry("sc.BA", new BigDecimal("5.500"));

    assertThat(response.schema()).isNotNull();
    assertThat(response.schema().path("da").path("mature").path("fields").isArray()).isTrue();
    assertThat(response.schema().path("sc").path("species").isArray()).isTrue();
    assertThat(response.catalog()).extracting("prefix")
        .containsExactly("da", "sc", "submission", "hbs", "fta");
    assertThat(response.catalog().get(2).description())
        .isEqualTo("Values provided during submission");
  }

  @DisplayName("Builds complete response for COASTAL area with sections")
  @Test
  void buildsCompleteResponseForCoastal() {
    DistrictRow dr = row("DNI", new BigDecimal("11.530"), null);
    Section section = new Section("Mature", List.of(dr));
    TableData dvData = new TableData(null, List.of(section), null, Map.of());
    DistrictVolumeEntity dvEntity = dvEntity(Area.COASTAL, dvData);

    SpeciesCompositionRow scRow = new SpeciesCompositionRow(
        new CodeDescriptionDto("DNI", "DNI"),
        Map.of("AL", new BigDecimal("0.000")));
    TableData scData = new TableData(null, null, List.of(scRow), Map.of());
    DistrictVolumeEntity scEntity = scEntity(Area.COASTAL, scData);

    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.DISTRICT_VOLUME, Area.COASTAL, DATE))
        .thenReturn(java.util.Optional.of(dvEntity));
    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.SPECIES_COMPOSITION, Area.COASTAL, DATE))
        .thenReturn(java.util.Optional.of(scEntity));

    FormulaVariablesResponse response = service.build(DATE, Area.COASTAL);

    VariableNodeDto daNode = response.namespaces().get("da");
    assertThat(daNode.children()).containsKey("mature");
    assertThat(response.flat()).containsKey("da.mature.avoidableSawlog");
    assertThat(response.flat()).containsKey("sc.AL");
  }

  @DisplayName("Throws when no district volume configuration is effective")
  @Test
  void throwsWhenNoDistrictVolumeConfig() {
    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.DISTRICT_VOLUME, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.empty());

    assertThatThrownBy(() -> service.build(DATE, Area.INTERIOR))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("district volume");
  }

  @DisplayName("Throws when no species composition configuration is effective")
  @Test
  void throwsWhenNoSpeciesCompositionConfig() {
    DistrictVolumeEntity dvEntity = dvEntity(Area.INTERIOR,
        new TableData(List.of(), null, null, Map.of()));
    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.DISTRICT_VOLUME, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.of(dvEntity));
    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.SPECIES_COMPOSITION, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.empty());

    assertThatThrownBy(() -> service.build(DATE, Area.INTERIOR))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("species composition");
  }

  @DisplayName("Handles empty zones gracefully")
  @Test
  void handlesEmptyZones() {
    DistrictVolumeEntity dvEntity = dvEntity(Area.INTERIOR,
        new TableData(List.of(), null, null, Map.of()));
    DistrictVolumeEntity scEntity = scEntity(Area.INTERIOR,
        new TableData(null, null, List.of(), Map.of()));

    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.DISTRICT_VOLUME, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.of(dvEntity));
    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.SPECIES_COMPOSITION, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.of(scEntity));

    FormulaVariablesResponse response = service.build(DATE, Area.INTERIOR);

    assertThat(response.namespaces().get("da").children()).isEmpty();
    assertThat(response.namespaces().get("sc").children()).isEmpty();
    assertThat(response.flat()).isEmpty();
  }

  @DisplayName("Includes additional properties from DistrictRow")
  @Test
  void includesAdditionalProperties() {
    DistrictRow districtRow = row("DCC", new BigDecimal("11.530"), null);
    districtRow.addProperty("futureMetric", new BigDecimal("7.125"));
    Zone zone = new Zone("Mature", List.of(districtRow));
    TableData dvData = new TableData(List.of(zone), null, null, Map.of());
    DistrictVolumeEntity dvEntity = dvEntity(Area.INTERIOR, dvData);

    DistrictVolumeEntity scEntity = scEntity(Area.INTERIOR,
        new TableData(null, null, List.of(), Map.of()));

    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.DISTRICT_VOLUME, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.of(dvEntity));
    when(districtVolumeRepository.findEffectiveByConfigTypeAndArea(
        ConfigType.SPECIES_COMPOSITION, Area.INTERIOR, DATE))
        .thenReturn(java.util.Optional.of(scEntity));

    FormulaVariablesResponse response = service.build(DATE, Area.INTERIOR);

    assertThat(response.flat()).containsEntry("da.mature.futureMetric",
        new BigDecimal("7.125"));
  }

  @DisplayName("Normalizes group names to lowercase alphanumeric")
  @Test
  void normalizesGroupNames() {
    assertThat(FormulaVariableService.normalizeGroupName("North Interior"))
        .isEqualTo("northinterior");
    assertThat(FormulaVariableService.normalizeGroupName("Mature")).isEqualTo("mature");
    assertThat(FormulaVariableService.normalizeGroupName(null)).isEqualTo("");
  }

  @DisplayName("VariableNodeDto factory methods produce correct types")
  @Test
  void variableNodeDtoFactories() {
    VariableNodeDto obj = VariableNodeDto.object("desc", Map.of());
    assertThat(obj.type()).isEqualTo("object");
    assertThat(obj.description()).isEqualTo("desc");
    assertThat(obj.children()).isEmpty();
    assertThat(obj.path()).isNull();
    assertThat(obj.value()).isNull();

    VariableNodeDto num = VariableNodeDto.number("da.x", new BigDecimal("1.000"), "X");
    assertThat(num.type()).isEqualTo("number");
    assertThat(num.path()).isEqualTo("da.x");
    assertThat(num.value()).isEqualByComparingTo("1.000");
    assertThat(num.label()).isEqualTo("X");
    assertThat(num.children()).isNull();
  }

  private DistrictVolumeEntity dvEntity(Area area, TableData data) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setConfigType(ConfigType.DISTRICT_VOLUME);
    entity.setArea(area);
    entity.setTableData(data);
    return entity;
  }

  private DistrictVolumeEntity scEntity(Area area, TableData data) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setConfigType(ConfigType.SPECIES_COMPOSITION);
    entity.setArea(area);
    entity.setTableData(data);
    return entity;
  }

  private DistrictRow row(String district, BigDecimal sawlog, BigDecimal gradeY) {
    return new DistrictRow(
        new CodeDescriptionDto(district, district),
        sawlog, null, null, null, gradeY, null, gradeY);
  }
}
