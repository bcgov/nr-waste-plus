package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.configuration.CodesProperties;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Codes Service")
class CodesServiceTest {

  private static final List<CodeDescriptionDto> HARVEST_STATUSES =
      List.of(
          new CodeDescriptionDto("C", "Complete"),
          new CodeDescriptionDto("I", "Incomplete"),
          new CodeDescriptionDto("NA", "N/A - Not applicable"));

  @Mock private LegacyApiProvider legacyApiProvider;
  @Mock private DistrictVolumeService districtVolumeService;
  @Mock private CodesProperties codesProperties;
  @Mock private ReportingUnitRepository reportingUnitRepository;
  @Mock private BlockRepository blockRepository;

  @InjectMocks private CodesService codesService;

  @Test
  @DisplayName("getMaturityTypeCodes returns unfiltered maturity codes from legacy API")
  void getMaturityTypeCodes_shouldReturnUnfilteredCodes() {
    var maturityCodes =
        List.of(new CodeDescriptionDto("MAT", "Mature"), new CodeDescriptionDto("IMM", "Immature"));
    when(legacyApiProvider.getMaturityTypeCodes()).thenReturn(maturityCodes);

    var result = codesService.getMaturityTypeCodes();

    assertThat(result).containsExactlyElementsOf(maturityCodes);
    verify(legacyApiProvider).getMaturityTypeCodes();
  }

  @Test
  @DisplayName("getHarvestStatusCodes without context returns unfiltered codes")
  void getHarvestStatusCodes_withoutContext_shouldReturnUnfilteredCodes() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);

    var result = codesService.getHarvestStatusCodes(null, null);

    assertThat(result).containsExactlyElementsOf(HARVEST_STATUSES);
  }

  @Test
  @DisplayName("getHarvestStatusCodes filters to interior allowlist when reporting unit is INTERIOR")
  void getHarvestStatusCodes_whenInteriorReportingUnit_shouldFilterToAllowlist() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, "INTERIOR")));
    when(codesProperties.getHarvestStatusVariants())
        .thenReturn(Map.of("INTERIOR", List.of("C", "I")));

    var result = codesService.getHarvestStatusCodes(10L, null);

    assertThat(result).extracting(CodeDescriptionDto::code).containsExactly("C", "I");
  }

  @Test
  @DisplayName("getHarvestStatusCodes filters to coastal allowlist when reporting unit is COASTAL")
  void getHarvestStatusCodes_whenCoastalReportingUnit_shouldFilterToAllowlist() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(11L))
        .thenReturn(Optional.of(reportingUnit(11L, "COASTAL")));
    when(codesProperties.getHarvestStatusVariants())
        .thenReturn(Map.of("COASTAL", List.of("C", "I", "NA")));

    var result = codesService.getHarvestStatusCodes(11L, null);

    assertThat(result).extracting(CodeDescriptionDto::code).containsExactly("C", "I", "NA");
  }

  @Test
  @DisplayName("getHarvestStatusCodes resolves variant from block when only blockId is provided")
  void getHarvestStatusCodes_whenOnlyBlockIdProvided_shouldResolveVariantFromBlock() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(blockRepository.findById(100L)).thenReturn(Optional.of(block(100L, 10L, false)));
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, "INTERIOR")));
    when(codesProperties.getHarvestStatusVariants())
        .thenReturn(Map.of("INTERIOR", List.of("C", "I")));

    var result = codesService.getHarvestStatusCodes(null, 100L);

    assertThat(result).extracting(CodeDescriptionDto::code).containsExactly("C", "I");
  }

  @Test
  @DisplayName("getHarvestStatusCodes returns filtered result when both IDs are consistent")
  void getHarvestStatusCodes_whenBothIdsConsistent_shouldFilter() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, "INTERIOR")));
    when(blockRepository.findById(100L)).thenReturn(Optional.of(block(100L, 10L, false)));
    when(codesProperties.getHarvestStatusVariants())
        .thenReturn(Map.of("INTERIOR", List.of("C", "I")));

    var result = codesService.getHarvestStatusCodes(10L, 100L);

    assertThat(result).extracting(CodeDescriptionDto::code).containsExactly("C", "I");
  }

  @Test
  @DisplayName("getHarvestStatusCodes returns unfiltered codes when IDs conflict")
  void getHarvestStatusCodes_whenIdsConflict_shouldReturnUnfiltered() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, "INTERIOR")));
    when(blockRepository.findById(100L)).thenReturn(Optional.of(block(100L, 99L, false)));

    var result = codesService.getHarvestStatusCodes(10L, 100L);

    assertThat(result).containsExactlyElementsOf(HARVEST_STATUSES);
  }

  @Test
  @DisplayName("getHarvestStatusCodes returns unfiltered codes when grade is unavailable")
  void getHarvestStatusCodes_whenGradeUnavailable_shouldReturnUnfiltered() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, null)));

    var result = codesService.getHarvestStatusCodes(10L, null);

    assertThat(result).containsExactlyElementsOf(HARVEST_STATUSES);
  }

  @Test
  @DisplayName("getHarvestStatusCodes returns unfiltered codes when reporting unit is not in postgres")
  void getHarvestStatusCodes_whenReportingUnitNotInPostgres_shouldReturnUnfiltered() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L)).thenReturn(Optional.empty());

    var result = codesService.getHarvestStatusCodes(10L, null);

    assertThat(result).containsExactlyElementsOf(HARVEST_STATUSES);
  }

  @Test
  @DisplayName("getHarvestStatusCodes returns unfiltered codes when block is not found")
  void getHarvestStatusCodes_whenBlockNotFound_shouldReturnUnfiltered() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(blockRepository.findById(100L)).thenReturn(Optional.empty());

    var result = codesService.getHarvestStatusCodes(null, 100L);

    assertThat(result).containsExactlyElementsOf(HARVEST_STATUSES);
  }

  @Test
  @DisplayName("getHarvestStatusCodes returns unfiltered codes when allowlist config is empty")
  void getHarvestStatusCodes_whenAllowlistEmpty_shouldReturnUnfiltered() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, "INTERIOR")));
    when(codesProperties.getHarvestStatusVariants()).thenReturn(Map.of());

    var result = codesService.getHarvestStatusCodes(10L, null);

    assertThat(result).containsExactlyElementsOf(HARVEST_STATUSES);
  }

  @Test
  @DisplayName("getHarvestStatusCodes returns unfiltered codes when grade is unsupported")
  void getHarvestStatusCodes_whenGradeUnsupported_shouldReturnUnfiltered() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, "UNKNOWN")));
    when(codesProperties.getHarvestStatusVariants())
        .thenReturn(Map.of("INTERIOR", List.of("C", "I")));

    var result = codesService.getHarvestStatusCodes(10L, null);

    assertThat(result).containsExactlyElementsOf(HARVEST_STATUSES);
  }

  @Test
  @DisplayName("getHarvestStatusCodes matches allowlist keys case-insensitively")
  void getHarvestStatusCodes_shouldMatchAllowlistKeysCaseInsensitively() {
    when(legacyApiProvider.getHarvestStatusCodes()).thenReturn(HARVEST_STATUSES);
    when(reportingUnitRepository.findByIdAndDeletedFalse(10L))
        .thenReturn(Optional.of(reportingUnit(10L, "coastal")));
    when(codesProperties.getHarvestStatusVariants())
        .thenReturn(Map.of("Coast", List.of("c", "i", "na")));

    var result = codesService.getHarvestStatusCodes(10L, null);

    assertThat(result).extracting(CodeDescriptionDto::code).containsExactly("C", "I", "NA");
  }

  private static ReportingUnitEntity reportingUnit(Long id, String gradeCode) {
    ReportingUnitEntity ru = new ReportingUnitEntity();
    ru.setId(id);
    ru.setGradeCode(gradeCode);
    return ru;
  }

  private static BlockEntity block(Long id, Long reportingUnitId, boolean deleted) {
    BlockEntity block = new BlockEntity();
    block.setId(id);
    block.setReportingUnitId(reportingUnitId);
    block.setDeleted(deleted);
    return block;
  }
}
