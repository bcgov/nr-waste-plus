package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictRow;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Section;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.DisplayName;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Formula Runtime Resolver")
class FormulaRuntimeResolverTest {
  @Mock private DistrictVolumeRepository repository;
  @InjectMocks private FormulaRuntimeResolver resolver;

  @DisplayName("Resolves Coast District Average Path")
  @Test
  void resolvesCoastDistrictAveragePath() {
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME, new TableData(null,
        List.of(new Section("Mature", List.of(row("DNI", null, new BigDecimal("11.530"))))), null,
        Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.DISTRICT_VOLUME, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThat(resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI",
        "da.mature.avoidableGradeY")).isEqualByComparingTo("11.530");
  }

  @DisplayName("Resolves Species Path")
  @Test
  void resolvesSpeciesPath() {
    DistrictVolumeEntity volume = volume(ConfigType.SPECIES_COMPOSITION, new TableData(null, null,
        List.of(new SpeciesCompositionRow(new CodeDescriptionDto("DNI", "DNI"),
            Map.of("AL", new BigDecimal("0.000")))), Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.SPECIES_COMPOSITION, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThat(resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI", "sc.AL"))
        .isEqualByComparingTo("0.000");
  }

  @DisplayName("Rejects Missing Field Clearly")
  @Test
  void rejectsMissingFieldClearly() {
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME, new TableData(null,
        List.of(new Section("Mature", List.of(row("DNI", null, null)))), null, Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.DISTRICT_VOLUME, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI",
        "da.mature.avoidableGradeY")).hasMessageContaining("avoidableGradeY");
  }

  @DisplayName("Resolves Numeric Field Not Known By The Domain Model")
  @Test
  void resolvesNumericFieldNotKnownByTheDomainModel() {
    DistrictRow row = row("DNI", null, null);
    row.addProperty("futureMetric", new BigDecimal("7.125"));
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME, new TableData(null,
        List.of(new Section("Mature", List.of(row))), null, Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.DISTRICT_VOLUME, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThat(resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI",
        "da.mature.futureMetric")).isEqualByComparingTo("7.125");
  }

  @DisplayName("Rejects Null Date")
  @Test
  void rejectsNullDate() {
    assertThatThrownBy(() -> resolver.resolve(null, Area.COASTAL, "DNI", "da.mature.x"))
        .isInstanceOf(NullPointerException.class);
  }

  @DisplayName("Rejects Null Area")
  @Test
  void rejectsNullArea() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), null, "DNI", "da.mature.x"))
        .isInstanceOf(NullPointerException.class);
  }

  @DisplayName("Rejects Null District")
  @Test
  void rejectsNullDistrict() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, null, "da.mature.x"))
        .hasMessageContaining("district");
  }

  @DisplayName("Rejects Blank District")
  @Test
  void rejectsBlankDistrict() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "  ", "da.mature.x"))
        .hasMessageContaining("district");
  }

  @DisplayName("Rejects Null Path")
  @Test
  void rejectsNullPath() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI", null))
        .hasMessageContaining("variable path");
  }

  @DisplayName("Rejects Blank Path")
  @Test
  void rejectsBlankPath() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI", "  "))
        .hasMessageContaining("variable path");
  }

  @DisplayName("Rejects Single Part Path")
  @Test
  void rejectsSinglePartPath() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI", "da"))
        .hasMessageContaining("Invalid formula variable path");
  }

  @DisplayName("Rejects Unknown Namespace")
  @Test
  void rejectsUnknownNamespace() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI", "xx.field"))
        .hasMessageContaining("namespace");
  }

  @DisplayName("Rejects Da Path With Wrong Segment Count")
  @Test
  void rejectsDaPathWithWrongSegmentCount() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI", "da.mature"))
        .hasMessageContaining("da.<group>.<field>");
  }

  @DisplayName("Rejects Sc Path With Wrong Segment Count")
  @Test
  void rejectsScPathWithWrongSegmentCount() {
    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI", "sc.AL.extra"))
        .hasMessageContaining("sc.<species>");
  }

  @DisplayName("Rejects Da Group Not Found")
  @Test
  void rejectsDaGroupNotFound() {
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME, new TableData(null,
        List.of(new Section("Mature", List.of(row("DNI", null, new BigDecimal("1"))))), null,
        Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.DISTRICT_VOLUME, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI",
        "da.nonexistent.field")).hasMessageContaining("Group");
  }

  @DisplayName("Rejects Da District Not In Group")
  @Test
  void rejectsDaDistrictNotInGroup() {
    DistrictVolumeEntity volume = volume(ConfigType.DISTRICT_VOLUME, new TableData(null,
        List.of(new Section("Mature", List.of(row("DNI", null, new BigDecimal("1"))))), null,
        Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.DISTRICT_VOLUME, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "XXX",
        "da.mature.field")).hasMessageContaining("District");
  }

  @DisplayName("Rejects Sc District Not Found")
  @Test
  void rejectsScDistrictNotFound() {
    DistrictVolumeEntity volume = volume(ConfigType.SPECIES_COMPOSITION, new TableData(null, null,
        List.of(new SpeciesCompositionRow(new CodeDescriptionDto("DNI", "DNI"),
            Map.of("AL", new BigDecimal("1")))), Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.SPECIES_COMPOSITION, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "XXX",
        "sc.AL")).hasMessageContaining("District");
  }

  @DisplayName("Rejects Sc Species Null Value")
  @Test
  void rejectsScSpeciesNullValue() {
    DistrictVolumeEntity volume = volume(ConfigType.SPECIES_COMPOSITION, new TableData(null, null,
        List.of(new SpeciesCompositionRow(new CodeDescriptionDto("DNI", "DNI"), Map.of())),
        Map.of()));
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.SPECIES_COMPOSITION, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.of(volume));

    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI",
        "sc.AL")).hasMessageContaining("Species");
  }

  @DisplayName("Rejects No Effective Da Configuration")
  @Test
  void rejectsNoEffectiveDaConfiguration() {
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.DISTRICT_VOLUME, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.empty());

    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI",
        "da.mature.field")).hasMessageContaining("No");
  }

  @DisplayName("Rejects No Effective Sc Configuration")
  @Test
  void rejectsNoEffectiveScConfiguration() {
    when(repository.findEffectiveByConfigTypeAndArea(ConfigType.SPECIES_COMPOSITION, Area.COASTAL,
        LocalDate.of(2026, 11, 3))).thenReturn(java.util.Optional.empty());

    assertThatThrownBy(() -> resolver.resolve(LocalDate.of(2026, 11, 3), Area.COASTAL, "DNI",
        "sc.AL")).hasMessageContaining("No");
  }

  private DistrictVolumeEntity volume(ConfigType type, TableData data) {
    DistrictVolumeEntity entity = new DistrictVolumeEntity();
    entity.setConfigType(type);
    entity.setArea(Area.COASTAL);
    entity.setTableData(data);
    return entity;
  }

  private DistrictRow row(String district, BigDecimal sawlog, BigDecimal gradeY) {
    return new DistrictRow(new CodeDescriptionDto(district, district), sawlog, null, null, null,
        gradeY, null, gradeY);
  }
}
