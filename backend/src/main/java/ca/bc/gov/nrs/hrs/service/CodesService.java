package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.configuration.CodesProperties;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.codes.DistrictAverageCriteriaCodeRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

/**
 * Service that exposes various code lists retrieved from the legacy API.
 *
 * <p>Acts as a thin adapter over {@link LegacyApiProvider} and provides methods to fetch district,
 * sampling, status, harvest status, and maturity type code lists used by the UI. Harvest status
 * codes can be scoped to a reporting unit variant (coast/interior) derived from database context
 * and filtered via {@link CodesProperties} (plan D33). District codes are enriched with geographic
 * area information from {@link DistrictVolumeService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class CodesService {

  private static final String COASTAL_VARIANT = "COASTAL";
  private static final String INTERIOR_VARIANT = "INTERIOR";

  private final LegacyApiProvider legacyApiProvider;
  private final DistrictVolumeService districtVolumeService;
  private final CodesProperties codesProperties;
  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final DistrictAverageCriteriaCodeRepository districtAverageCriteriaCodeRepository;

  /**
   * Retrieves district codes from the legacy API, enriched with geographic area information.
   *
   * <p>For each district code, fetches the list of configured geographic areas (INTERIOR, COASTAL)
   * from the district volume service and attaches them to the response.
   *
   * @return list of district {@link CodeDescriptionDto} with areas populated
   */
  @NewSpan
  public List<CodeDescriptionDto> getDistrictCodes() {
    log.info("Fetching district codes from legacy API");
    var districtCodes = legacyApiProvider.getDistrictCodes();
    var areasMap =
        districtVolumeService.getAreasForMultipleDistricts(
            districtCodes.stream().map(CodeDescriptionDto::code).toList());
    return districtCodes.stream()
        .map(dto -> dto.withAreas(areasMap.getOrDefault(dto.code(), List.of())))
        .toList();
  }

  /**
   * Retrieves sampling options from the legacy API.
   *
   * @return list of sampling {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getSamplingCodes() {
    log.info("Fetching sampling options from legacy API");
    return legacyApiProvider.getSamplingCodes();
  }

  /**
   * Retrieves assess area status codes from the legacy API.
   *
   * @return list of status {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Fetching assess area statuses from legacy API");
    return legacyApiProvider.getStatusCodes();
  }

  /**
   * Retrieves harvest status codes from the legacy API, optionally scoped to a reporting-unit
   * variant derived from database context.
   *
   * <p>When {@code reportingUnitId} and/or {@code blockId} are provided, the service attempts to
   * resolve the reporting unit's coast/interior grade from the database. If a variant can be
   * resolved and {@link CodesProperties} declares an allowlist for it, only matching codes are
   * returned. When no context is provided, context is unresolved, grade is unavailable (including
   * legacy-only reporting units), or no allowlist applies, all upstream codes are returned.
   *
   * @param reportingUnitId optional reporting unit identifier for variant resolution
   * @param blockId optional block identifier for variant resolution
   * @return list of harvest status {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getHarvestStatusCodes(Long reportingUnitId, Long blockId) {
    log.info(
        "Fetching harvest status codes (reportingUnitId={}, blockId={})", reportingUnitId, blockId);
    List<CodeDescriptionDto> harvestStatuses = legacyApiProvider.getHarvestStatusCodes();
    String resolvedVariant = resolveHarvestStatusVariant(reportingUnitId, blockId);
    if (StringUtils.isBlank(resolvedVariant)) {
      return harvestStatuses;
    }

    Set<String> allowedCodes = resolveAllowedHarvestStatusCodes(resolvedVariant);
    if (allowedCodes.isEmpty()) {
      log.info(
          "No harvest status allowlist configured for variant '{}'; returning unfiltered codes",
          resolvedVariant);
      return harvestStatuses;
    }

    return harvestStatuses.stream()
        .filter(dto -> dto != null && dto.code() != null)
        .filter(dto -> allowedCodes.contains(normalizeToken(dto.code())))
        .toList();
  }

  /**
   * Retrieves waste maturity type codes from the legacy API.
   *
   * <p>Maturity options are returned as a stable, unfiltered set (not coast/interior variant
   * scoped).
   *
   * @return list of maturity type {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getMaturityTypeCodes() {
    log.info("Fetching maturity type codes from legacy API");
    return legacyApiProvider.getMaturityTypeCodes();
  }

  /**
   * Retrieves currently effective district average criteria codes from Postgres.
   *
   * <p>Codes are ordered by numeric criterion (1..11). Descriptions are returned as stored without a
   * numeric prefix; the frontend appends the criterion number.
   *
   * @return list of district average criteria {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getDistrictAverageCriteriaCodes() {
    log.info("Fetching district average criteria codes from postgres");
    return districtAverageCriteriaCodeRepository
        .findEffectiveOrderedByCode(LocalDateTime.now())
        .stream()
        .map(code -> new CodeDescriptionDto(code.getCode(), code.getDescription()))
        .toList();
  }

  private String resolveHarvestStatusVariant(Long reportingUnitId, Long blockId) {
    if (reportingUnitId == null && blockId == null) {
      return null;
    }

    Optional<ReportingUnitEntity> reportingUnitFromParam = Optional.empty();
    if (reportingUnitId != null) {
      reportingUnitFromParam = reportingUnitRepository.findByIdAndDeletedFalse(reportingUnitId);
      if (reportingUnitFromParam.isEmpty()) {
        log.info(
            "Reporting unit {} not found in postgres for harvest status variant resolution",
            reportingUnitId);
      }
    }

    final Optional<BlockEntity> block =
        blockId == null
            ? Optional.empty()
            : blockRepository.findById(blockId).filter(b -> !b.isDeleted());
    if (blockId != null && block.isEmpty()) {
      log.info("Block {} not found for harvest status variant resolution", blockId);
      return null;
    }

    if (reportingUnitId != null && block.isPresent()
        && !Objects.equals(reportingUnitId, block.get().getReportingUnitId())) {
      log.info(
          "Conflicting context for harvest status variant resolution: reportingUnitId={} blockId={} (block reportingUnitId={})",
          reportingUnitId,
          blockId,
          block.get().getReportingUnitId());
      return null;
    }

    Long effectiveReportingUnitId =
        reportingUnitFromParam
            .map(ReportingUnitEntity::getId)
            .or(() -> block.map(BlockEntity::getReportingUnitId))
            .orElse(reportingUnitId);

    if (effectiveReportingUnitId == null) {
      return null;
    }

    ReportingUnitEntity reportingUnit =
        reportingUnitFromParam
            .or(() -> reportingUnitRepository.findByIdAndDeletedFalse(effectiveReportingUnitId))
            .orElse(null);

    String gradeCode = reportingUnit != null ? reportingUnit.getGradeCode() : null;
    if (StringUtils.isBlank(gradeCode)) {
      log.info(
          "No grade available for reporting unit {} when resolving harvest status variant",
          effectiveReportingUnitId);
      return null;
    }

    String normalizedGrade = normalizeToken(gradeCode);
    if (COASTAL_VARIANT.equals(normalizedGrade) || "COAST".equals(normalizedGrade)) {
      return COASTAL_VARIANT;
    }
    if (INTERIOR_VARIANT.equals(normalizedGrade)) {
      return INTERIOR_VARIANT;
    }

    log.info(
        "Unsupported grade '{}' for reporting unit {} when resolving harvest status variant",
        gradeCode,
        effectiveReportingUnitId);
    return null;
  }

  private Set<String> resolveAllowedHarvestStatusCodes(String variant) {
    Map<String, List<String>> configured = codesProperties.getHarvestStatusVariants();
    if (configured == null || configured.isEmpty()) {
      return Set.of();
    }

    return configured.entrySet().stream()
        .filter(entry -> normalizeToken(entry.getKey()).equals(normalizeToken(variant))
            || isVariantAliasMatch(entry.getKey(), variant))
        .map(Map.Entry::getValue)
        .filter(Objects::nonNull)
        .flatMap(Collection::stream)
        .filter(StringUtils::isNotBlank)
        .map(this::normalizeToken)
        .collect(Collectors.toUnmodifiableSet());
  }

  private boolean isVariantAliasMatch(String configuredKey, String variant) {
    String normalizedKey = normalizeToken(configuredKey);
    String normalizedVariant = normalizeToken(variant);
    if (COASTAL_VARIANT.equals(normalizedVariant)) {
      return "COAST".equals(normalizedKey) || COASTAL_VARIANT.equals(normalizedKey);
    }
    if (INTERIOR_VARIANT.equals(normalizedVariant)) {
      return INTERIOR_VARIANT.equals(normalizedKey);
    }
    return normalizedKey.equals(normalizedVariant);
  }

  private String normalizeToken(String value) {
    return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
  }
}
