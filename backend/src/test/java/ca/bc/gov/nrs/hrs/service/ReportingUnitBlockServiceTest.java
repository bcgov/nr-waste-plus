package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.configuration.BlockRulesProperties;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.BlockRuleDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockMarkRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockSubmitterRepository;
import ca.bc.gov.nrs.hrs.repository.block.DistrictAverageBlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | ReportingUnitBlockService")
class ReportingUnitBlockServiceTest {

  private static final Long REPORTING_UNIT_ID = 123L;

  @Mock private ReportingUnitRepository reportingUnitRepository;
  @Mock private BlockRepository blockRepository;
  @Mock private BlockMarkRepository blockMarkRepository;
  @Mock private StatusEventRepository statusEventRepository;
  @Mock private BlockSubmitterRepository blockSubmitterRepository;
  @Mock private DistrictAverageBlockRepository districtAverageBlockRepository;
  @Mock private LegacyApiProvider legacyApiProvider;
  @Mock private BlockRulesProperties blockRulesProperties;

  @InjectMocks private ReportingUnitBlockService service;

  @Test
  @DisplayName("shouldReadPostgresBlocks_whenReportingUnitExistsInPostgres")
  void shouldReadPostgresBlocks_whenReportingUnitExistsInPostgres() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.of(new ReportingUnitEntity()));
    when(blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderById(REPORTING_UNIT_ID))
        .thenReturn(List.of());

    var result = service.getBlockList(REPORTING_UNIT_ID);

    assertThat(result.getContent()).isEmpty();
    verify(legacyApiProvider, never()).getReportingUnitDetails(REPORTING_UNIT_ID);
    verify(legacyApiProvider, never()).getReportingUnitBlocks(REPORTING_UNIT_ID);
  }

  @Test
  @DisplayName("shouldReadLegacyBlocks_whenReportingUnitIsNotInPostgres")
  void shouldReadLegacyBlocks_whenReportingUnitIsNotInPostgres() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.empty());
    when(legacyApiProvider.getReportingUnitDetails(REPORTING_UNIT_ID))
        .thenReturn(new ReportingUnitLegacyDetailsDto(null, null, null, null));
    when(legacyApiProvider.getReportingUnitBlocks(REPORTING_UNIT_ID)).thenReturn(List.of());

    var result = service.getBlockList(REPORTING_UNIT_ID);

    assertThat(result.getContent()).isEmpty();
    verify(legacyApiProvider).getReportingUnitDetails(REPORTING_UNIT_ID);
    verify(legacyApiProvider).getReportingUnitBlocks(REPORTING_UNIT_ID);
  }

  @Test
  @DisplayName("shouldPreservePostgresSourceFlag_whenEnrichingDetails")
  void shouldPreservePostgresSourceFlag_whenEnrichingDetails() {
    var details =
        new ReportingUnitDetailsDto(
            REPORTING_UNIT_ID,
            null,
            null,
            new CodeDescriptionDto("AVG", "Average"),
            null,
            null);
    when(blockRulesProperties.getSampling())
        .thenReturn(
            java.util.Map.of(
                "AVG", new BlockRulesProperties.SamplingBlockRule(1, "DISTRICT_AVERAGE")));

    var enriched = service.enrichWithBlockMetadata(details.withLegacy(false));

    assertThat(enriched.isLegacy()).isFalse();
    assertThat(enriched.blockRule()).isEqualTo(new BlockRuleDto(1, "DISTRICT_AVERAGE"));
    verify(reportingUnitRepository, never()).findByIdAndDeletedFalse(REPORTING_UNIT_ID);
  }

  @Test
  @DisplayName("shouldPreserveLegacySourceFlag_whenEnrichingDetails")
  void shouldPreserveLegacySourceFlag_whenEnrichingDetails() {
    var details =
        new ReportingUnitDetailsDto(
                REPORTING_UNIT_ID,
                null,
                null,
                new CodeDescriptionDto("AGR", "Agriculture"),
                null,
                null)
            .withLegacy(true);

    var enriched = service.enrichWithBlockMetadata(details);

    assertThat(enriched.isLegacy()).isTrue();
    assertThat(enriched.blockRule()).isNull();
    verify(reportingUnitRepository, never()).findByIdAndDeletedFalse(REPORTING_UNIT_ID);
  }

  @Test
  @DisplayName("shouldPropagate404_whenLegacyBlockListReportsUnknownUnit")
  void shouldPropagate404_whenLegacyBlockListReportsUnknownUnit() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.empty());
    when(legacyApiProvider.getReportingUnitDetails(REPORTING_UNIT_ID))
        .thenThrow(new NotFoundGenericException("Reporting Unit", REPORTING_UNIT_ID.toString()));

    assertThatThrownBy(() -> service.getBlockList(REPORTING_UNIT_ID))
        .isInstanceOf(NotFoundGenericException.class)
        .hasMessageContaining("not found");

    verify(legacyApiProvider, never()).getReportingUnitBlocks(REPORTING_UNIT_ID);
  }
}
