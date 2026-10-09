package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.configuration.BlockRulesProperties;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.BlockRuleDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitLegacyDetailsDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockListItemProjection;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.service.block.BlockService;
import io.micrometer.observation.annotation.Observed;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Read service for reporting-unit block lists and block metadata enrichment.
 *
 * <p>Blocks live in two places: reporting units persisted in postgres are assembled from the block
 * tables, while everything else is delegated to the legacy API through {@link LegacyApiProvider}.
 * This service also attaches block-creation metadata — the sampling rule and the legacy marker —
 * to reporting unit details before they are returned to the caller.
 *
 * <p>Block reads are authenticated by the shared GET security rules and scoped to the owning
 * client number: BCeID business callers must hold a viewer or submitter role for the reporting
 * unit's client, mirroring the block details and calculation endpoints.
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class ReportingUnitBlockService {

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
          "DFT", FALLBACK_STATUS_NAME,
          "SUB", "Submitted",
          "APP", "Approved",
          "BIS", "Billing Issued",
          "OREJ", "Office Rejected",
          "HLD", "Hold");

  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final LegacyApiProvider legacyApiProvider;
  private final BlockRulesProperties blockRulesProperties;
  private final BlockService blockService;

  /**
   * Retrieve the block list for a reporting unit as a single page.
   *
   * <p>Reporting units with a postgres record are assembled locally; otherwise the legacy endpoint
   * verifies existence before returning its block list. Rows are wrapped in a single page whose
   * size is at least ten so an empty list still reports {@code size: 10}, matching the frontend's
   * empty payload.
   *
   * <p>Before any rows are read the owning client number is resolved from the reporting unit and
   * handed to {@link BlockService#enforceClientScope}, so BCeID callers cannot enumerate another
   * client's blocks.
   *
   * @param reportingUnitId the reporting unit to list blocks for
   * @param jwt the authenticated caller's token
   * @return a single {@link Page} of block rows; never null
   * @throws ResponseStatusException with HTTP 403 if a BCeID caller is scoped to a different
   *     client than the reporting unit's owner
   */
  public Page<BlockListItemDto> getBlockList(Long reportingUnitId, Jwt jwt) {
    List<BlockListItemDto> rows;
    Optional<ReportingUnitEntity> reportingUnit =
        reportingUnitRepository.findByIdAndDeletedFalse(reportingUnitId);
    if (reportingUnit.isPresent()) {
      blockService.enforceClientScope(
          jwt, reportingUnitId, reportingUnit.get().getClientNumber());
      rows = buildPostgresBlocks(reportingUnitId);
    } else {
      ReportingUnitLegacyDetailsDto legacyReportingUnit =
          legacyApiProvider.getReportingUnitDetails(reportingUnitId);
      blockService.enforceClientScope(jwt, reportingUnitId, legacyReportingUnit.clientNumber());
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
    return blockRepository.findBlockListItemsByReportingUnitId(reportingUnitId)
        .stream()
        .map(this::toBlockListItem)
        .toList();
  }

  private BlockListItemDto toBlockListItem(BlockListItemProjection row) {
    String cutBlockId = row.getCutBlockId();
    return new BlockListItemDto(
        row.getId(),
        row.getLicenseNumber(),
        row.getCuttingPermit(),
        cutBlockId == null ? "" : cutBlockId,
        row.getTimberMark(),
        row.getTotalWasteAreaHa(),
        null,
        row.getSubmitter(),
        resolveStatus(row.getRawStatus()),
        toLocalDateTime(row.getUpdatedAt()),
        row.getBlockType());
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
