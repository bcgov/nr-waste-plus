package ca.bc.gov.nrs.hrs.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.configuration.BlockRulesProperties;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.BlockRuleDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;
import ca.bc.gov.nrs.hrs.entity.block.DistrictAverageBlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockMarkRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockSubmitterRepository;
import ca.bc.gov.nrs.hrs.repository.block.DistrictAverageBlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
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
  @DisplayName("shouldMapPostgresBlockFields_whenBlockHasMarkAreaStatusAndSubmitter")
  void shouldMapPostgresBlockFields_whenBlockHasMarkAreaStatusAndSubmitter() {
    Instant updatedAt = Instant.parse("2025-04-03T12:30:00Z");
    BlockEntity block = block(901L, updatedAt);
    BlockMarkEntity firstMark = mark("CUT-1", "FILE-1", "CP-1", "TM-1");
    BlockMarkEntity secondMark = mark("CUT-2", "FILE-2", "CP-2", "TM-2");
    DistrictAverageBlockEntity area = new DistrictAverageBlockEntity();
    area.setCoastGroundBasedAreaHa(new BigDecimal("12.125"));
    area.setCoastHelicopterAreaHa(new BigDecimal("3.375"));
    StatusEventEntity status = new StatusEventEntity();
    status.setStatus(" approved ");
    BlockSubmitterEntity submitter = new BlockSubmitterEntity();
    submitter.setSubmitterName("Alex Example");

    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.of(new ReportingUnitEntity()));
    when(blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderById(REPORTING_UNIT_ID))
        .thenReturn(List.of(block));
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(901L, "PRIMARY"))
        .thenReturn(List.of(firstMark, secondMark));
    when(statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(901L))
        .thenReturn(Optional.of(status));
    when(blockSubmitterRepository.findFirstByBlockIdAndDeletedFalseOrderById(901L))
        .thenReturn(Optional.of(submitter));
    when(districtAverageBlockRepository.findByBlockIdAndDeletedFalse(901L))
        .thenReturn(Optional.of(area));

    var result = service.getBlockList(REPORTING_UNIT_ID);

    assertThat(result.getContent())
        .containsExactly(
            new BlockListItemDto(
                901L,
                "FILE-1",
                "CP-1",
                "CUT-1",
                "TM-1",
                new BigDecimal("15.500"),
                null,
                "Alex Example",
                new BlockListItemDto.Status("APP", "Approved"),
                LocalDateTime.ofInstant(updatedAt, ZoneId.systemDefault())));
    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getSize()).isEqualTo(10);
    verify(blockMarkRepository)
        .findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(901L, "PRIMARY");
  }

  @Test
  @DisplayName("shouldReturnNullArea_whenDistrictAverageExtensionDoesNotExist")
  void shouldReturnNullArea_whenDistrictAverageExtensionDoesNotExist() {
    assertThat(readOnePostgresBlockWithArea(Optional.empty()).totalWasteAreaHa()).isNull();
  }

  @Test
  @DisplayName("shouldReturnGroundArea_whenHelicopterAreaIsNull")
  void shouldReturnGroundArea_whenHelicopterAreaIsNull() {
    DistrictAverageBlockEntity extension = new DistrictAverageBlockEntity();
    extension.setCoastGroundBasedAreaHa(new BigDecimal("7.125"));
    extension.setCoastHelicopterAreaHa(null);

    assertThat(readOnePostgresBlockWithArea(Optional.of(extension)).totalWasteAreaHa())
        .isEqualByComparingTo("7.125");
  }

  @Test
  @DisplayName("shouldMapMissingPostgresMetadataToContractFallbacks_whenRelationsAreAbsent")
  void shouldMapMissingPostgresMetadataToContractFallbacks_whenRelationsAreAbsent() {
    BlockEntity block = block(902L, null);
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.of(new ReportingUnitEntity()));
    when(blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderById(REPORTING_UNIT_ID))
        .thenReturn(List.of(block));
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(902L, "PRIMARY"))
        .thenReturn(List.of());
    when(statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(902L))
        .thenReturn(Optional.empty());
    when(blockSubmitterRepository.findFirstByBlockIdAndDeletedFalseOrderById(902L))
        .thenReturn(Optional.empty());
    when(districtAverageBlockRepository.findByBlockIdAndDeletedFalse(902L))
        .thenReturn(Optional.empty());

    var result = service.getBlockList(REPORTING_UNIT_ID);

    assertThat(result.getContent())
        .containsExactly(
            new BlockListItemDto(
                902L,
                null,
                null,
                "",
                null,
                null,
                null,
                null,
                new BlockListItemDto.Status("DFT", "Draft"),
                null));
  }

  @ParameterizedTest(name = "shouldResolveStatusAliasAndKnownCode_whenStatusIs {0}")
  @ValueSource(
      strings = {"DFT", "SUB", "APP", "BIS", "OREJ", "HLD", "draft", " submitted "})
  @DisplayName("shouldResolveKnownStatusCodesAndAliases_whenStatusIsSupported")
  void shouldResolveKnownStatusCodesAndAliases_whenStatusIsSupported(String rawStatus) {
    String expectedCode =
        switch (rawStatus.trim().toUpperCase(java.util.Locale.ROOT)) {
          case "DRAFT" -> "DFT";
          case "SUBMITTED" -> "SUB";
          default -> rawStatus.trim().toUpperCase(java.util.Locale.ROOT);
        };
    String expectedDescription =
        Map.of(
                "DFT", "Draft",
                "SUB", "Submitted",
                "APP", "Approved",
                "BIS", "Billing Issued",
                "OREJ", "Office Rejected",
                "HLD", "Hold")
            .get(expectedCode);

    var result = readOnePostgresBlockWithStatus(rawStatus);

    assertThat(result.status()).isEqualTo(new BlockListItemDto.Status(expectedCode, expectedDescription));
  }

  @ParameterizedTest
  @NullSource
  @ValueSource(strings = {"", "   ", "UNKNOWN"})
  @DisplayName("shouldUseDraftStatus_whenStatusIsNullBlankOrUnknown")
  void shouldUseDraftStatus_whenStatusIsNullBlankOrUnknown(String rawStatus) {
    var result = readOnePostgresBlockWithStatus(rawStatus);

    assertThat(result.status()).isEqualTo(new BlockListItemDto.Status("DFT", "Draft"));
  }

  @Test
  @DisplayName("shouldSumSingleAvailableArea_whenOtherAreaIsNull")
  void shouldSumSingleAvailableArea_whenOtherAreaIsNull() {
    DistrictAverageBlockEntity extension = new DistrictAverageBlockEntity();
    extension.setCoastGroundBasedAreaHa(null);
    extension.setCoastHelicopterAreaHa(new BigDecimal("2.750"));

    assertThat(readOnePostgresBlockWithArea(Optional.of(extension)).totalWasteAreaHa())
        .isEqualByComparingTo("2.750");
  }

  @Test
  @DisplayName("shouldReturnNullArea_whenBothAreaValuesAreNull")
  void shouldReturnNullArea_whenBothAreaValuesAreNull() {
    DistrictAverageBlockEntity extension = new DistrictAverageBlockEntity();
    extension.setCoastGroundBasedAreaHa(null);
    extension.setCoastHelicopterAreaHa(null);

    assertThat(readOnePostgresBlockWithArea(Optional.of(extension)).totalWasteAreaHa()).isNull();
  }

  @Test
  @DisplayName("shouldMapMultiplePostgresBlocks_inRepositoryOrder")
  void shouldMapMultiplePostgresBlocks_inRepositoryOrder() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.of(new ReportingUnitEntity()));
    when(blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderById(REPORTING_UNIT_ID))
        .thenReturn(List.of(block(904L, null), block(905L, null)));
    for (long id : List.of(904L, 905L)) {
      when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(id, "PRIMARY"))
          .thenReturn(List.of());
      when(statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(id))
          .thenReturn(Optional.empty());
      when(blockSubmitterRepository.findFirstByBlockIdAndDeletedFalseOrderById(id))
          .thenReturn(Optional.empty());
      when(districtAverageBlockRepository.findByBlockIdAndDeletedFalse(id))
          .thenReturn(Optional.empty());
    }

    var result = service.getBlockList(REPORTING_UNIT_ID);

    assertThat(result.getContent()).extracting(BlockListItemDto::id).containsExactly(904L, 905L);
    assertThat(result.getSize()).isEqualTo(10);
  }

  @Test
  @DisplayName("shouldPreserveLegacyBlockRows_whenReportingUnitIsNotInPostgres")
  void shouldPreserveLegacyBlockRows_whenReportingUnitIsNotInPostgres() {
    var legacyRow =
        new BlockListItemDto(
            77L,
            "FILE-L",
            null,
            "CUT-L",
            "TM-L",
            new BigDecimal("4.2"),
            new BigDecimal("8.1"),
            "Legacy submitter",
            new BlockListItemDto.Status("SUB", "Submitted"),
            null);
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.empty());
    when(legacyApiProvider.getReportingUnitDetails(REPORTING_UNIT_ID))
        .thenReturn(new ReportingUnitLegacyDetailsDto(null, null, null, null));
    when(legacyApiProvider.getReportingUnitBlocks(REPORTING_UNIT_ID)).thenReturn(List.of(legacyRow));

    var result = service.getBlockList(REPORTING_UNIT_ID);

    assertThat(result.getContent()).containsExactly(legacyRow);
    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getSize()).isEqualTo(10);
  }

  @Test
  @DisplayName("shouldNotQueryPostgresBlocks_whenReportingUnitIsMissingFromPostgres")
  void shouldNotQueryPostgresBlocks_whenReportingUnitIsMissingFromPostgres() {
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.empty());
    when(legacyApiProvider.getReportingUnitDetails(REPORTING_UNIT_ID))
        .thenReturn(new ReportingUnitLegacyDetailsDto(null, null, null, null));
    when(legacyApiProvider.getReportingUnitBlocks(REPORTING_UNIT_ID)).thenReturn(List.of());

    service.getBlockList(REPORTING_UNIT_ID);

    verify(blockRepository, never())
        .findAllByReportingUnitIdAndDeletedFalseOrderById(REPORTING_UNIT_ID);
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

  @Test
  @DisplayName("shouldOmitRule_whenSamplingIsNull")
  void shouldOmitRule_whenSamplingIsNull() {
    var details = details(null);

    assertThat(service.enrichWithBlockMetadata(details).blockRule()).isNull();
  }

  @Test
  @DisplayName("shouldOmitRule_whenSamplingCodeIsNull")
  void shouldOmitRule_whenSamplingCodeIsNull() {
    var details = details(new CodeDescriptionDto(null, "Unknown"));

    assertThat(service.enrichWithBlockMetadata(details).blockRule()).isNull();
  }

  @Test
  @DisplayName("shouldOmitRule_whenSamplingRulesAreNotConfigured")
  void shouldOmitRule_whenSamplingRulesAreNotConfigured() {
    when(blockRulesProperties.getSampling()).thenReturn(null);

    assertThat(service.enrichWithBlockMetadata(details(new CodeDescriptionDto("AVG", "Average"))).blockRule())
        .isNull();
  }

  @Test
  @DisplayName("shouldOmitRule_whenSamplingCodeHasNoConfiguredRule")
  void shouldOmitRule_whenSamplingCodeHasNoConfiguredRule() {
    when(blockRulesProperties.getSampling()).thenReturn(Map.of("AGR", rule()));

    assertThat(service.enrichWithBlockMetadata(details(new CodeDescriptionDto("AVG", "Average")).withLegacy(true)))
        .satisfies(
            enriched -> {
              assertThat(enriched.blockRule()).isNull();
              assertThat(enriched.isLegacy()).isTrue();
            });
  }

  private BlockListItemDto readOnePostgresBlockWithStatus(String rawStatus) {
    BlockEntity block = block(903L, null);
    StatusEventEntity status = new StatusEventEntity();
    status.setStatus(rawStatus);
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.of(new ReportingUnitEntity()));
    when(blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderById(REPORTING_UNIT_ID))
        .thenReturn(List.of(block));
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(903L, "PRIMARY"))
        .thenReturn(List.of());
    when(statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(903L))
        .thenReturn(Optional.of(status));
    when(blockSubmitterRepository.findFirstByBlockIdAndDeletedFalseOrderById(903L))
        .thenReturn(Optional.empty());
    when(districtAverageBlockRepository.findByBlockIdAndDeletedFalse(903L))
        .thenReturn(Optional.empty());

    return service.getBlockList(REPORTING_UNIT_ID).getContent().getFirst();
  }

  private BlockListItemDto readOnePostgresBlockWithArea(Optional<DistrictAverageBlockEntity> area) {
    when(reportingUnitRepository.findByIdAndDeletedFalse(REPORTING_UNIT_ID))
        .thenReturn(Optional.of(new ReportingUnitEntity()));
    when(blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderById(REPORTING_UNIT_ID))
        .thenReturn(List.of(block(906L, null)));
    when(blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(906L, "PRIMARY"))
        .thenReturn(List.of());
    when(statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(906L))
        .thenReturn(Optional.empty());
    when(blockSubmitterRepository.findFirstByBlockIdAndDeletedFalseOrderById(906L))
        .thenReturn(Optional.empty());
    when(districtAverageBlockRepository.findByBlockIdAndDeletedFalse(906L)).thenReturn(area);

    return service.getBlockList(REPORTING_UNIT_ID).getContent().getFirst();
  }

  private static BlockEntity block(Long id, Instant updatedAt) {
    BlockEntity block = new BlockEntity();
    block.setId(id);
    block.setUpdatedAt(updatedAt);
    return block;
  }

  private static BlockMarkEntity mark(
      String cutBlockId, String forestFileId, String cuttingPermitId, String timberMark) {
    BlockMarkEntity mark = new BlockMarkEntity();
    mark.setCutBlockId(cutBlockId);
    mark.setForestFileId(forestFileId);
    mark.setCuttingPermitId(cuttingPermitId);
    mark.setTimberMark(timberMark);
    return mark;
  }

  private static ReportingUnitDetailsDto details(CodeDescriptionDto sampling) {
    return new ReportingUnitDetailsDto(REPORTING_UNIT_ID, null, null, sampling, null, null);
  }

  private static BlockRulesProperties.SamplingBlockRule rule() {
    return new BlockRulesProperties.SamplingBlockRule(1, "DISTRICT_AVERAGE");
  }
}
