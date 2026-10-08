package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.configuration.BlockRulesProperties;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.BlockRuleDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;
import ca.bc.gov.nrs.hrs.entity.block.DistrictAverageBlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockMarkRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockSubmitterRepository;
import ca.bc.gov.nrs.hrs.repository.block.DistrictAverageBlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import io.micrometer.observation.annotation.Observed;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * Read service for reporting-unit block lists and block metadata enrichment.
 *
 * <p>Blocks live in two places: reporting units persisted in postgres are assembled from the block
 * tables, while everything else is delegated to the legacy API through {@link LegacyApiProvider}.
 * This service also attaches block-creation metadata — the sampling rule and the legacy marker —
 * to reporting unit details before they are returned to the caller.
 *
 * <p>Block reads are authenticated by the shared GET security rules but apply no client-number
 * scoping, matching the frontend contract for the block-list endpoints.
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class ReportingUnitBlockService {

  private static final String PRIMARY_MARK_TYPE = "PRIMARY";

  /** Page size reported for an empty block list, matching the frontend's empty payload. */
  private static final int EMPTY_PAGE_SIZE = 10;

  private static final String FALLBACK_STATUS_CODE = "DFT";
  private static final String FALLBACK_STATUS_NAME = "Draft";

  /** Long-form status names occasionally produced before codes were normalised. */
  private static final Map<String, String> STATUS_CODE_ALIASES =
      Map.of(
          "DRAFT", "DFT",
          "SUBMITTED", "SUB",
          "APPROVED", "APP");

  /** Descriptions kept aligned with the legacy waste assessment area status code table. */
  private static final Map<String, String> STATUS_DESCRIPTIONS =
      Map.of(
          "DFT", "Draft",
          "SUB", "Submitted",
          "APP", "Approved",
          "BIS", "Billing Issued",
          "OREJ", "Office Rejected",
          "HLD", "Hold");

  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final BlockMarkRepository blockMarkRepository;
  private final StatusEventRepository statusEventRepository;
  private final BlockSubmitterRepository blockSubmitterRepository;
  private final DistrictAverageBlockRepository districtAverageBlockRepository;
  private final LegacyApiProvider legacyApiProvider;
  private final BlockRulesProperties blockRulesProperties;

  /**
   * Retrieve the block list for a reporting unit as a single page.
   *
   * <p>Reporting units with a postgres record are assembled locally; otherwise the legacy endpoint
   * verifies existence before returning its block list. Rows are wrapped in a single page whose
   * size is at least ten so an empty list still reports {@code size: 10}, matching the frontend's
   * empty payload.
   *
   * @param reportingUnitId the reporting unit to list blocks for
   * @return a single {@link Page} of block rows; never null
   */
  public Page<BlockListItemDto> getBlockList(Long reportingUnitId) {
    List<BlockListItemDto> rows;
    if (reportingUnitRepository.findByIdAndDeletedFalse(reportingUnitId).isPresent()) {
      rows = buildPostgresBlocks(reportingUnitId);
    } else {
      legacyApiProvider.getReportingUnitDetails(reportingUnitId);
      rows = legacyApiProvider.getReportingUnitBlocks(reportingUnitId);
    }

    return new PageImpl<>(
        rows, PageRequest.of(0, Math.max(rows.size(), EMPTY_PAGE_SIZE)), rows.size());
  }

  /**
   * Attach block metadata to reporting unit details.
   *
   * <p>Adds the block-creation rule for the unit's sampling code — omitted from the response when
   * no rule is configured. The source marker set by {@link ReportingUnitService} is preserved.
   *
   * @param details the reporting unit details to enrich, including its source marker; must not be
   *     null
   * @return the details with block metadata populated
   */
  public ReportingUnitDetailsDto enrichWithBlockMetadata(ReportingUnitDetailsDto details) {
    return details.withBlockRule(resolveBlockRule(details.sampling()));
  }

  private BlockRuleDto resolveBlockRule(CodeDescriptionDto sampling) {
    if (sampling == null || sampling.code() == null || blockRulesProperties.getSampling() == null) {
      return null;
    }

    BlockRulesProperties.SamplingBlockRule rule =
        blockRulesProperties.getSampling().get(sampling.code());

    return rule == null ? null : new BlockRuleDto(rule.maxBlocks(), rule.blockType());
  }

  private List<BlockListItemDto> buildPostgresBlocks(Long reportingUnitId) {
    return blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderById(reportingUnitId)
        .stream()
        .map(this::toBlockListItem)
        .toList();
  }

  private BlockListItemDto toBlockListItem(BlockEntity block) {
    BlockMarkEntity primaryMark = findPrimaryMark(block.getId());
    StatusEventEntity latestStatus =
        statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(block.getId()).orElse(null);
    BlockSubmitterEntity submitter =
        blockSubmitterRepository.findFirstByBlockIdAndDeletedFalseOrderById(block.getId())
            .orElse(null);
    String cutBlockId = primaryMark == null ? null : primaryMark.getCutBlockId();

    return new BlockListItemDto(
        block.getId(),
        primaryMark == null ? null : primaryMark.getForestFileId(),
        primaryMark == null ? null : primaryMark.getCuttingPermitId(),
        cutBlockId == null ? "" : cutBlockId,
        primaryMark == null ? null : primaryMark.getTimberMark(),
        resolveTotalAreaHa(block.getId()),
        null,
        submitter == null ? null : submitter.getSubmitterName(),
        resolveStatus(latestStatus == null ? null : latestStatus.getStatus()),
        toLocalDateTime(block.getUpdatedAt()));
  }

  private BlockMarkEntity findPrimaryMark(Long blockId) {
    List<BlockMarkEntity> marks =
        blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
            blockId, PRIMARY_MARK_TYPE);

    return marks.isEmpty() ? null : marks.getFirst();
  }

  private BigDecimal resolveTotalAreaHa(Long blockId) {
    DistrictAverageBlockEntity districtAverageBlock =
        districtAverageBlockRepository.findByBlockIdAndDeletedFalse(blockId).orElse(null);

    if (districtAverageBlock == null
        || (districtAverageBlock.getCoastGroundBasedAreaHa() == null
            && districtAverageBlock.getCoastHelicopterAreaHa() == null)) {
      return null;
    }

    BigDecimal total = BigDecimal.ZERO;
    if (districtAverageBlock.getCoastGroundBasedAreaHa() != null) {
      total = total.add(districtAverageBlock.getCoastGroundBasedAreaHa());
    }
    if (districtAverageBlock.getCoastHelicopterAreaHa() != null) {
      total = total.add(districtAverageBlock.getCoastHelicopterAreaHa());
    }

    return total;
  }

  private static BlockListItemDto.Status resolveStatus(String rawStatus) {
    if (rawStatus == null || rawStatus.isBlank()) {
      return fallbackStatus();
    }

    String code = rawStatus.trim().toUpperCase(Locale.ROOT);
    code = STATUS_CODE_ALIASES.getOrDefault(code, code);
    String description = STATUS_DESCRIPTIONS.get(code);

    return description == null ? fallbackStatus() : new BlockListItemDto.Status(code, description);
  }

  private static BlockListItemDto.Status fallbackStatus() {
    return new BlockListItemDto.Status(FALLBACK_STATUS_CODE, FALLBACK_STATUS_NAME);
  }

  private static LocalDateTime toLocalDateTime(Instant instant) {
    return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
  }
}
