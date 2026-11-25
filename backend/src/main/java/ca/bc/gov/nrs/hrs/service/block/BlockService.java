package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockMarkDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockType;
import ca.bc.gov.nrs.hrs.dto.block.DistrictAverageVolumeRowDto;
import ca.bc.gov.nrs.hrs.dto.block.DistrictAverageVolumeTotalsDto;
import ca.bc.gov.nrs.hrs.dto.block.DistrictAverageVolumesSummaryDto;
import ca.bc.gov.nrs.hrs.dto.block.WasteAssessmentAreaMarkDto;
import ca.bc.gov.nrs.hrs.dto.block.WasteAssessmentAreaSummaryDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockAreaSegmentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.DuplicateBlockException;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitStateConflictException;
import ca.bc.gov.nrs.hrs.mapper.block.BlockMapper;
import ca.bc.gov.nrs.hrs.mapper.block.BlockMarkMapper;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockAreaSegmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockMarkRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Service managing core submission blocks for reporting units. */
@Service
@RequiredArgsConstructor
@Slf4j
@Observed
public class BlockService {

  public static final String DEFAULT_INITIAL_STATE = "SUBMISSION";
  private static final String DRAFT_STATUS_CODE = "DFT";
  private static final String ONE_DA_PER_RU_CONSTRAINT = "uq_block_one_da_per_ru";
  private static final String MARK_TYPE_SECONDARY = "SECONDARY";
  private static final String MARK_TYPE_ROAD_PERMIT = "ROAD_PERMIT";

  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final StatusEventRepository statusEventRepository;
  private final LegacyApiProvider legacyApiProvider;
  private final BlockMapper blockMapper;
  private final BlockMarkRepository blockMarkRepository;
  private final BlockMarkMapper blockMarkMapper;
  private final BlockAreaSegmentRepository blockAreaSegmentRepository;

  private Clock clock = Clock.systemDefaultZone();

  void setClock(Clock clock) {
    this.clock = clock;
  }

  /**
   * Creates a new submission block under the specified reporting unit, validating the expected
   * reporting unit state precondition if supplied.
   *
   * @param jwt caller JWT for tenant authorization
   * @param reportingUnitId target reporting unit
   * @param blockType block subtype to create
   * @param expectedReportingUnitState expected lifecycle state precondition (e.g. "SUBMISSION")
   * @return newly created and persisted block entity
   * @throws ReportingUnitNotFoundException if reporting unit is unknown or outside caller scope
   * @throws ForbiddenException if caller lacks submitter permissions for the reporting unit's client
   * @throws ReportingUnitStateConflictException if expected state does not match actual state
   * @throws DuplicateBlockException if creating a duplicate DA block for the reporting unit
   */
  @NewSpan
  @Transactional
  public BlockEntity create(
      Jwt jwt, Long reportingUnitId, BlockType blockType, String expectedReportingUnitState) {
    return doCreate(jwt, reportingUnitId, blockType, expectedReportingUnitState);
  }

  /**
   * Shared block-creation implementation behind the public {@code create} entry points.
   *
   * <p>Callers must reach this logic through a public, {@code @Transactional} method so the
   * Spring proxy applies the service-level transaction; calling it directly would bypass
   * proxy-based instrumentation.
   */
  private BlockEntity doCreate(
      Jwt jwt, Long reportingUnitId, BlockType blockType, String expectedReportingUnitState) {
    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantCreateAccess(jwt, reportingUnit);
    validateReportingUnitState(reportingUnit, expectedReportingUnitState);

    BlockEntity entity = new BlockEntity();
    entity.setReportingUnitId(reportingUnitId);
    entity.setBlockType(blockType.name());
    entity.setDraft(true);
    // revision left null to trigger JPA persist rather than merge

    try {
      return blockRepository.saveAndFlush(entity);
    } catch (DataIntegrityViolationException ex) {
      if (isUniqueDaBlockViolation(ex)) {
        log.warn(
            "Conflict: A District Average block already exists for reporting unit {}",
            reportingUnitId);
        throw new DuplicateBlockException();
      }
      throw ex;
    }
  }

  /**
   * Creates a new submission block under the specified reporting unit.
   *
   * @param jwt caller JWT for tenant authorization
   * @param reportingUnitId target reporting unit
   * @param blockType block subtype to create
   * @return newly created and persisted block entity
   */
  @NewSpan
  @Transactional
  public BlockEntity create(Jwt jwt, Long reportingUnitId, BlockType blockType) {
    return doCreate(jwt, reportingUnitId, blockType, null);
  }

  /**
   * Creates a new submission block without JWT tenant scoping.
   *
   * @param reportingUnitId target reporting unit
   * @param blockType block subtype to create
   * @return newly created and persisted block entity
   */
  @NewSpan
  @Transactional
  public BlockEntity create(Long reportingUnitId, BlockType blockType) {
    return doCreate(null, reportingUnitId, blockType, null);
  }

  /**
   * Retrieves a non-deleted block that belongs to the specified reporting unit.
   *
   * @param jwt caller JWT for tenant authorization
   * @param reportingUnitId owning reporting unit
   * @param blockId target block identifier
   * @return the owned block entity
   * @throws BlockNotFoundException if block is not found or does not belong to the reporting unit
   * @throws ReportingUnitNotFoundException if reporting unit is outside caller scope
   */
  @NewSpan
  @Transactional(readOnly = true)
  public BlockEntity getOwned(Jwt jwt, Long reportingUnitId, Long blockId) {
    return doGetOwned(jwt, reportingUnitId, blockId);
  }

  /**
   * Retrieves a non-deleted block that belongs to the specified reporting unit without JWT tenant scoping.
   *
   * @param reportingUnitId owning reporting unit
   * @param blockId target block identifier
   * @return the owned block entity
   */
  @NewSpan
  @Transactional(readOnly = true)
  public BlockEntity getOwned(Long reportingUnitId, Long blockId) {
    return doGetOwned(null, reportingUnitId, blockId);
  }

  private BlockEntity doGetOwned(Jwt jwt, Long reportingUnitId, Long blockId) {
    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    return blockRepository
        .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
        .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));
  }

  /**
   * Retrieves all non-deleted blocks for a reporting unit ordered by ID ascending.
   *
   * @param jwt caller JWT for tenant authorization
   * @param reportingUnitId target reporting unit
   * @return list of non-deleted blocks
   * @throws ReportingUnitNotFoundException if reporting unit is unknown or outside caller scope
   */
  @NewSpan
  @Transactional(readOnly = true)
  public List<BlockEntity> findAllByReportingUnitId(Jwt jwt, Long reportingUnitId) {
    return doFindAllByReportingUnitId(jwt, reportingUnitId);
  }

  /**
   * Retrieves all non-deleted blocks for a reporting unit ordered by ID ascending without JWT scoping.
   *
   * @param reportingUnitId target reporting unit
   * @return list of non-deleted blocks
   */
  @NewSpan
  @Transactional(readOnly = true)
  public List<BlockEntity> findAllByReportingUnitId(Long reportingUnitId) {
    return doFindAllByReportingUnitId(null, reportingUnitId);
  }

  private List<BlockEntity> doFindAllByReportingUnitId(Jwt jwt, Long reportingUnitId) {
    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    return blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderByIdAsc(reportingUnitId);
  }

  /**
   * Retrieve the details of a block owned by the given reporting unit.
   *
   * <p>When the reporting unit exists in postgres the block is loaded from the block tables and
   * mapped with {@code isLegacy=false}. Otherwise the legacy reporting-unit details are fetched —
   * its 404 propagates unchanged — and the block is located in the legacy block list, mapped with
   * {@code isLegacy=true} and nulls for every field the legacy row does not carry.
   *
   * @param reportingUnitId the owning reporting unit
   * @param blockId the block to retrieve
   * @param jwt the authenticated caller's token
   * @return the block details, with the store-of-origin marker set
   * @throws NotFoundGenericException if the reporting unit or block cannot be found in the owning
   *     store
   * @throws ResponseStatusException with HTTP 403 if a BCeID caller is scoped to a different
   *     client than the block's owner
   */
  public BlockResponseDto getBlockDetails(Long reportingUnitId, Long blockId, Jwt jwt) {
    return reportingUnitRepository
        .findByIdAndDeletedFalse(reportingUnitId)
        .map(
            reportingUnit ->
                getPostgresBlockDetails(
                    reportingUnitId, blockId, jwt, reportingUnit.getClientNumber()))
        .orElseGet(() -> getLegacyBlockDetails(reportingUnitId, blockId, jwt));
  }

  private BlockResponseDto getPostgresBlockDetails(
      Long reportingUnitId, Long blockId, Jwt jwt, String clientNumber) {
    BlockEntity block =
        blockRepository
            .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
            .orElseThrow(() -> new NotFoundGenericException("Block", String.valueOf(blockId)));

    enforceClientScope(jwt, reportingUnitId, clientNumber);

    BlockResponseDto dto = blockMapper.toResponseDto(block);
    dto = dto.withState(resolveBlockState(blockId, block.isDraft()));
    dto =
        withTimberMarks(
            dto, loadSecondaryTimberMarks(blockId), loadRoadPermitTimberMarks(blockId));
    dto = withWasteAssessmentAreaSummary(dto, buildPostgresWasteAssessmentAreaSummary(blockId));
    dto = withDistrictAverageVolumesSummary(dto, buildPostgresDistrictAverageVolumesSummary());
    return withResolvedPlcDate(dto);
  }

  private String resolveBlockState(Long blockId, boolean draft) {
    return statusEventRepository
        .findFirstByBlockIdOrderByCreatedAtDescIdDesc(blockId)
        .map(StatusEventEntity::getStatus)
        .orElse(draft ? "DRAFT" : "ACTIVE");
  }

  private BlockResponseDto getLegacyBlockDetails(Long reportingUnitId, Long blockId, Jwt jwt) {
    var legacyReportingUnit = legacyApiProvider.getReportingUnitDetails(reportingUnitId);

    BlockListItemDto legacyRow =
        legacyApiProvider.getReportingUnitBlocksStrict(reportingUnitId).stream()
            .filter(row -> row.id() != null && row.id().equals(blockId))
            .findFirst()
            .orElseThrow(() -> new NotFoundGenericException("Block", String.valueOf(blockId)));

    enforceClientScope(jwt, reportingUnitId, legacyReportingUnit.clientNumber());

    var expanded = legacyApiProvider.getSearchExpanded(reportingUnitId, blockId);
    List<BlockMarkDto> secondaryTimberMarks = toLegacySecondaryTimberMarks(blockId, expanded);
    List<BlockMarkDto> roadPermitTimberMarks =
        toLegacyRoadPermitTimberMarks(blockId, legacyRow, expanded);
    WasteAssessmentAreaSummaryDto wasteAssessmentAreaSummary =
        buildLegacyWasteAssessmentAreaSummary(expanded);
    DistrictAverageVolumesSummaryDto districtAverageVolumesSummary =
        buildLegacyDistrictAverageVolumesSummary(
            legacyApiProvider.getDistrictAverageVolumes(reportingUnitId, blockId));

    return toLegacyResponseDto(
        reportingUnitId,
        legacyRow,
        secondaryTimberMarks,
        roadPermitTimberMarks,
        wasteAssessmentAreaSummary,
        districtAverageVolumesSummary);
  }

  /**
   * Enforce owning-client scoping for a reporting-unit-scoped read.
   *
   * <p>Shared by the block details, block list and calculation reads so every reporting-unit
   * endpoint applies the same rule: BUSINESS_BCEID callers must hold a viewer or submitter role
   * for the owning client number; IDIR and BCSC callers are unrestricted.
   *
   * <p>Retained as defense-in-depth for service-layer callers; primary resource-scope
   * authorization (covering both BCeID client and IDIR district boundaries) is enforced
   * upstream by {@link ca.bc.gov.nrs.hrs.security.ResourceScopeGuard}.
   *
   * @param jwt the authenticated caller's token
   * @param reportingUnitId the reporting unit being read
   * @param clientNumber the owning client number resolved by the caller
   * @throws ReportingUnitNotFoundException if a BCeID caller is scoped to a different
   *     client than the block's owner (no existence disclosure)
   */
  public void enforceClientScope(Jwt jwt, Long reportingUnitId, String clientNumber) {
    if (IdentityProvider.BUSINESS_BCEID.equals(JwtPrincipalUtil.getIdentityProvider(jwt))
        && !hasClientRole(jwt, clientNumber)) {
      log.warn(
          "SECURITY: BCeID user {} attempted unauthorized access to block details for RU {}",
          JwtPrincipalUtil.getUserId(jwt),
          reportingUnitId);
      throw new ReportingUnitNotFoundException(reportingUnitId);
    }
  }

  private boolean hasClientRole(Jwt jwt, String clientNumber) {
    return JwtPrincipalUtil.hasAbstractRole(jwt, Role.VIEWER, clientNumber)
        || JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, clientNumber);
  }

  private void validateTenantAccess(Jwt jwt, ReportingUnitEntity reportingUnit) {
    if (jwt == null) {
      return;
    }
    IdentityProvider idp = JwtPrincipalUtil.getIdentityProvider(jwt);
    if (IdentityProvider.BUSINESS_BCEID == idp) {
      List<String> userClientNumbers = JwtPrincipalUtil.getClientFromRoles(jwt);
      if (!userClientNumbers.contains(reportingUnit.getClientNumber())) {
        log.warn(
            "SECURITY: BCeID user {} attempted unauthorized access to reporting unit {}",
            JwtPrincipalUtil.getUserId(jwt),
            reportingUnit.getId());
        throw new ReportingUnitNotFoundException(reportingUnit.getId());
      }
    }
  }

  private void validateTenantCreateAccess(Jwt jwt, ReportingUnitEntity reportingUnit) {
    if (jwt == null) {
      return;
    }
    IdentityProvider idp = JwtPrincipalUtil.getIdentityProvider(jwt);
    if (IdentityProvider.BUSINESS_BCEID == idp) {
      List<String> userClientNumbers = JwtPrincipalUtil.getClientFromRoles(jwt);
      if (!userClientNumbers.contains(reportingUnit.getClientNumber())) {
        log.warn(
            "SECURITY: BCeID user {} attempted unauthorized access to reporting unit {}",
            JwtPrincipalUtil.getUserId(jwt),
            reportingUnit.getId());
        throw new ReportingUnitNotFoundException(reportingUnit.getId());
      }
      if (!JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, reportingUnit.getClientNumber())) {
        log.warn(
            "SECURITY: BCeID user {} lacks SUBMITTER role for reporting unit {} client {}",
            JwtPrincipalUtil.getUserId(jwt),
            reportingUnit.getId(),
            reportingUnit.getClientNumber());
        throw new ForbiddenException(
            "User lacks submitter role for client " + reportingUnit.getClientNumber());
      }
    }
  }

  private String resolveReportingUnitState(Long reportingUnitId) {
    return statusEventRepository
        .findFirstByReportingUnitIdOrderByCreatedAtDescIdDesc(reportingUnitId)
        .map(StatusEventEntity::getStatus)
        .orElse(DEFAULT_INITIAL_STATE);
  }

  private void validateReportingUnitState(
      ReportingUnitEntity reportingUnit, String expectedReportingUnitState) {
    if (expectedReportingUnitState != null) {
      String actualState = resolveReportingUnitState(reportingUnit.getId());
      if (!actualState.equalsIgnoreCase(expectedReportingUnitState.trim())) {
        log.warn(
            "Conflict: Reporting unit {} expected state '{}' does not match actual state '{}'",
            reportingUnit.getId(),
            expectedReportingUnitState,
            actualState);
        throw new ReportingUnitStateConflictException(expectedReportingUnitState, actualState);
      }
    }
  }

  private boolean isUniqueDaBlockViolation(DataIntegrityViolationException ex) {
    Throwable current = ex;
    while (current != null) {
      if (current instanceof ConstraintViolationException cve) {
        if (ONE_DA_PER_RU_CONSTRAINT.equalsIgnoreCase(cve.getConstraintName())) {
          return true;
        }
      }
      if (current instanceof SQLException sqlEx) {
        if ("23505".equals(sqlEx.getSQLState())) {
          String msg = sqlEx.getMessage();
          if (msg != null && msg.toLowerCase().contains(ONE_DA_PER_RU_CONSTRAINT)) {
            return true;
          }
        }
      }
      String msg = current.getMessage();
      if (msg != null && msg.toLowerCase().contains(ONE_DA_PER_RU_CONSTRAINT)) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }

  /**
   * Map a legacy block-list row to the resource response contract.
   *
   * <p>The legacy row only carries the block identifier and lifecycle status. Draft state is
   * derived from the {@code DFT} status code; every other non-identifier field is null and the
   * legacy marker is {@code true}. {@code blockType} stays null on purpose: the legacy (Oracle)
   * payload carries no block subtype, so the envelope reports the subtype as unknown.
   */
  private BlockResponseDto toLegacyResponseDto(
      Long reportingUnitId,
      BlockListItemDto row,
      List<BlockMarkDto> secondaryTimberMarks,
      List<BlockMarkDto> roadPermitTimberMarks,
      WasteAssessmentAreaSummaryDto wasteAssessmentAreaSummary,
      DistrictAverageVolumesSummaryDto districtAverageVolumesSummary) {
    boolean draft =
        row.status() != null && DRAFT_STATUS_CODE.equals(row.status().code());
    String state = draft ? "DRAFT" : "ACTIVE";
    return new BlockResponseDto(
        row.id(),
        reportingUnitId,
        null,
        state,
        draft,
        resolvePlcDate(null),
        null,
        null,
        true,
        null,
        null,
        secondaryTimberMarks,
        roadPermitTimberMarks,
        wasteAssessmentAreaSummary,
        districtAverageVolumesSummary);
  }

  BlockResponseDto withResolvedPlcDate(BlockResponseDto dto) {
    LocalDate resolvedPlcDate = resolvePlcDate(dto.plcDate());
    if (resolvedPlcDate.equals(dto.plcDate())) {
      return dto;
    }
    return new BlockResponseDto(
        dto.id(),
        dto.reportingUnitId(),
        dto.blockType(),
        dto.state(),
        dto.draft(),
        resolvedPlcDate,
        dto.version(),
        dto.revision(),
        dto.isLegacy(),
        dto.createdAt(),
        dto.updatedAt(),
        dto.secondaryTimberMarks(),
        dto.roadPermitTimberMarks(),
        dto.wasteAssessmentAreaSummary(),
        dto.districtAverageVolumesSummary());
  }

  private BlockResponseDto withTimberMarks(
      BlockResponseDto dto,
      List<BlockMarkDto> secondaryTimberMarks,
      List<BlockMarkDto> roadPermitTimberMarks) {
    return new BlockResponseDto(
        dto.id(),
        dto.reportingUnitId(),
        dto.blockType(),
        dto.state(),
        dto.draft(),
        dto.plcDate(),
        dto.version(),
        dto.revision(),
        dto.isLegacy(),
        dto.createdAt(),
        dto.updatedAt(),
        secondaryTimberMarks,
        roadPermitTimberMarks,
        dto.wasteAssessmentAreaSummary(),
        dto.districtAverageVolumesSummary());
  }

  private BlockResponseDto withWasteAssessmentAreaSummary(
      BlockResponseDto dto, WasteAssessmentAreaSummaryDto wasteAssessmentAreaSummary) {
    return new BlockResponseDto(
        dto.id(),
        dto.reportingUnitId(),
        dto.blockType(),
        dto.state(),
        dto.draft(),
        dto.plcDate(),
        dto.version(),
        dto.revision(),
        dto.isLegacy(),
        dto.createdAt(),
        dto.updatedAt(),
        dto.secondaryTimberMarks(),
        dto.roadPermitTimberMarks(),
        wasteAssessmentAreaSummary,
        dto.districtAverageVolumesSummary());
  }

  private BlockResponseDto withDistrictAverageVolumesSummary(
      BlockResponseDto dto, DistrictAverageVolumesSummaryDto districtAverageVolumesSummary) {
    return new BlockResponseDto(
        dto.id(),
        dto.reportingUnitId(),
        dto.blockType(),
        dto.state(),
        dto.draft(),
        dto.plcDate(),
        dto.version(),
        dto.revision(),
        dto.isLegacy(),
        dto.createdAt(),
        dto.updatedAt(),
        dto.secondaryTimberMarks(),
        dto.roadPermitTimberMarks(),
        dto.wasteAssessmentAreaSummary(),
        districtAverageVolumesSummary);
  }


  private WasteAssessmentAreaSummaryDto buildPostgresWasteAssessmentAreaSummary(Long blockId) {
    List<BlockMarkEntity> primaryMarks =
        nullSafeList(
                blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
                    blockId, "PRIMARY"))
            .stream()
            .sorted(
                Comparator.comparing(
                        BlockMarkEntity::getSequenceNo, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(
                        BlockMarkEntity::getId, Comparator.nullsLast(Long::compareTo)))
            .toList();
    List<BlockMarkEntity> secondaryMarks =
        nullSafeList(
            blockMarkRepository.findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
                blockId, MARK_TYPE_SECONDARY));

    Map<Long, BigDecimal> netAreaByMarkId = sumNetWasteAreaByMarkId(blockId);

    WasteAssessmentAreaMarkDto primary = null;
    if (!primaryMarks.isEmpty()) {
      BlockMarkEntity primaryMark = primaryMarks.get(0);
      primary =
          new WasteAssessmentAreaMarkDto(
              resolveMarkDisplayValue(primaryMark), netAreaByMarkId.get(primaryMark.getId()));
    }

    List<WasteAssessmentAreaMarkDto> secondary =
        secondaryMarks.stream()
            .map(
                mark ->
                    new WasteAssessmentAreaMarkDto(
                        resolveMarkDisplayValue(mark), netAreaByMarkId.get(mark.getId())))
            .toList();

    BigDecimal total =
        zeroIfNull(primary == null ? null : primary.netWasteAreaHa())
            .add(
                secondary.stream()
                    .map(WasteAssessmentAreaMarkDto::netWasteAreaHa)
                    .reduce(BigDecimal.ZERO, (acc, value) -> acc.add(zeroIfNull(value))));

    return new WasteAssessmentAreaSummaryDto(primary, secondary, total);
  }

  private WasteAssessmentAreaSummaryDto buildLegacyWasteAssessmentAreaSummary(
      ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto expanded) {
    if (expanded == null) {
      return new WasteAssessmentAreaSummaryDto(null, List.of(), BigDecimal.ZERO);
    }

    // For a multi-mark block netArea is the whole-block total, so the primary row must use the
    // mark's own attributed area; otherwise adding the secondary rows would double-count.
    Double primaryArea =
        Boolean.TRUE.equals(expanded.multiMark()) ? expanded.markArea() : expanded.netArea();

    WasteAssessmentAreaMarkDto primary =
        new WasteAssessmentAreaMarkDto(expanded.timberMark(), toBigDecimal(primaryArea));

    List<WasteAssessmentAreaMarkDto> secondary =
        expanded.secondaryMarks() == null
            ? List.of()
            : expanded.secondaryMarks().stream()
                .filter(java.util.Objects::nonNull)
                .filter(
                    secondaryMark ->
                        secondaryMark.mark() != null && !secondaryMark.mark().isBlank())
                .filter(secondaryMark -> !isRoadPermitMark(secondaryMark.mark()))
                .map(
                    secondaryMark ->
                        new WasteAssessmentAreaMarkDto(
                            secondaryMark.mark(), toBigDecimal(secondaryMark.area())))
                .toList();

    BigDecimal total =
        zeroIfNull(primary.netWasteAreaHa())
            .add(
                secondary.stream()
                    .map(WasteAssessmentAreaMarkDto::netWasteAreaHa)
                    .reduce(BigDecimal.ZERO, (acc, value) -> acc.add(zeroIfNull(value))));

    if (primary.timberMarkId() == null && primary.netWasteAreaHa() == null) {
      primary = null;
    }

    return new WasteAssessmentAreaSummaryDto(primary, secondary, total);
  }

  private Map<Long, BigDecimal> sumNetWasteAreaByMarkId(Long blockId) {
    List<BlockAreaSegmentEntity> segments =
        nullSafeList(blockAreaSegmentRepository.findByBlockIdAndDeletedFalse(blockId));
    Map<Long, BigDecimal> totals = new HashMap<>();
    for (BlockAreaSegmentEntity segment : segments) {
      if (segment == null
          || segment.getBlockMarkId() == null
          || segment.getNetWasteAreaHa() == null) {
        continue;
      }
      totals.merge(segment.getBlockMarkId(), segment.getNetWasteAreaHa(), BigDecimal::add);
    }
    return totals;
  }

  private <T> List<T> nullSafeList(List<T> values) {
    return values == null ? List.of() : values;
  }

  private String resolveMarkDisplayValue(BlockMarkEntity mark) {
    if (mark == null) {
      return null;
    }
    if (mark.getTimberMark() != null) {
      String trimmed = mark.getTimberMark().trim();
      if (!trimmed.isEmpty()) {
        return trimmed;
      }
    }
    return mark.getMark();
  }

  private BigDecimal toBigDecimal(Double value) {
    return value == null ? null : BigDecimal.valueOf(value);
  }

  private BigDecimal zeroIfNull(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private List<BlockMarkDto> loadSecondaryTimberMarks(Long blockId) {
    return blockMarkRepository
        .findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(blockId, MARK_TYPE_SECONDARY)
        .stream()
        .map(blockMarkMapper::toDto)
        .toList();
  }

  private List<BlockMarkDto> loadRoadPermitTimberMarks(Long blockId) {
    return blockMarkRepository
        .findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(blockId, MARK_TYPE_ROAD_PERMIT)
        .stream()
        .map(blockMarkMapper::toDto)
        .toList();
  }

  private List<BlockMarkDto> toLegacySecondaryTimberMarks(
      Long blockId, ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto expanded) {
    java.util.ArrayList<BlockMarkDto> marks = new java.util.ArrayList<>();
    if (expanded != null && expanded.secondaryMarks() != null) {
      int sequence = 1;
      for (var secondary : expanded.secondaryMarks()) {
        if (secondary == null
            || secondary.mark() == null
            || secondary.mark().isBlank()
            || isRoadPermitMark(secondary.mark())) {
          continue;
        }
        // Secondary marks are child rows that may belong to a different forest file; the legacy
        // search payload exposes only mark/status/area, so identifiers stay null rather than
        // inheriting the block's file/permit/cutblock values.
        marks.add(
            new BlockMarkDto(
                null,
                blockId,
                MARK_TYPE_SECONDARY,
                sequence++,
                secondary.mark(),
                secondary.status() != null ? secondary.status().code() : null,
                null,
                secondary.mark(),
                null,
                null));
      }
    }
    return List.copyOf(marks);
  }

  private List<BlockMarkDto> toLegacyRoadPermitTimberMarks(
      Long blockId,
      BlockListItemDto legacyRow,
      ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto expanded) {
    java.util.ArrayList<BlockMarkDto> marks = new java.util.ArrayList<>();
    java.util.LinkedHashSet<String> seen = new java.util.LinkedHashSet<>();
    addLegacyRoadPermitMark(seen, marks, blockId, legacyRow, legacyRow.timberMark(), "VALID", true);
    if (expanded != null) {
      addLegacyRoadPermitMark(
          seen,
          marks,
          blockId,
          legacyRow,
          expanded.timberMark(),
          expanded.status() != null ? expanded.status().code() : null,
          true);
      if (expanded.secondaryMarks() != null) {
        appendSecondaryRoadPermitMarks(seen, marks, blockId, legacyRow, expanded);
      }
    }
    java.util.ArrayList<BlockMarkDto> sequenced = new java.util.ArrayList<>(marks.size());
    for (int i = 0; i < marks.size(); i++) {
      BlockMarkDto m = marks.get(i);
      sequenced.add(
          new BlockMarkDto(
              m.id(),
              m.blockId(),
              m.markType(),
              i + 1,
              m.mark(),
              m.validationStatus(),
              m.forestFileId(),
              m.timberMark(),
              m.cuttingPermitId(),
              m.cutBlockId()));
    }
    return List.copyOf(sequenced);
  }

  private void appendSecondaryRoadPermitMarks(
      java.util.Set<String> seen,
      java.util.List<BlockMarkDto> marks,
      Long blockId,
      BlockListItemDto legacyRow,
      ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto expanded) {
    for (var secondary : expanded.secondaryMarks()) {
      if (secondary == null) {
        continue;
      }
      addLegacyRoadPermitMark(
          seen,
          marks,
          blockId,
          legacyRow,
          secondary.mark(),
          secondary.status() != null ? secondary.status().code() : null,
          false);
    }
  }

  private void addLegacyRoadPermitMark(
      java.util.Set<String> seen,
      java.util.List<BlockMarkDto> marks,
      Long blockId,
      BlockListItemDto legacyRow,
      String markValue,
      String validationStatus,
      boolean primaryMark) {
    if (markValue == null || markValue.isBlank() || !isRoadPermitMark(markValue)) {
      return;
    }
    String normalized = markValue.trim().toUpperCase(Locale.ROOT);
    if (!seen.add(normalized)) {
      return;
    }
    // Only the block's primary mark inherits the reporting unit's identifiers; road marks derived
    // from secondary marks may belong to a different licence, so their identifiers stay null.
    marks.add(
        new BlockMarkDto(
            null,
            blockId,
            MARK_TYPE_ROAD_PERMIT,
            marks.size() + 1,
            markValue.trim(),
            validationStatus,
            primaryMark ? legacyRow.licenseNumber() : null,
            markValue.trim(),
            primaryMark ? legacyRow.cuttingPermit() : null,
            primaryMark ? legacyRow.cutBlockId() : null));
  }

  private boolean isRoadPermitMark(String mark) {
    if (mark == null) {
      return false;
    }
    String trimmed = mark.trim();
    return !trimmed.isEmpty() && Character.toUpperCase(trimmed.charAt(0)) == 'R';
  }


  private DistrictAverageVolumesSummaryDto buildPostgresDistrictAverageVolumesSummary() {
    // OQ3: no structured per-row DA volume data persisted in Postgres yet; return empty summary.
    return DistrictAverageVolumesSummaryDto.empty();
  }

  private DistrictAverageVolumesSummaryDto buildLegacyDistrictAverageVolumesSummary(
      List<ca.bc.gov.nrs.hrs.dto.search.DistrictAverageVolumeLegacyDto> legacyRows) {
    if (legacyRows == null || legacyRows.isEmpty()) {
      return DistrictAverageVolumesSummaryDto.empty();
    }
    List<DistrictAverageVolumeRowDto> rows =
        legacyRows.stream()
            .filter(java.util.Objects::nonNull)
            .map(this::toLegacyDistrictAverageVolumeRow)
            .toList();
    if (rows.isEmpty()) {
      return DistrictAverageVolumesSummaryDto.empty();
    }
    BigDecimal totalBillable =
        rows.stream()
            .map(DistrictAverageVolumeRowDto::totalBillableVolumeM3)
            .reduce(BigDecimal.ZERO, (acc, value) -> acc.add(zeroIfNull(value)));
    BigDecimal totalCutControl =
        rows.stream()
            .map(DistrictAverageVolumeRowDto::totalCutControlVolumeM3)
            .reduce(BigDecimal.ZERO, (acc, value) -> acc.add(zeroIfNull(value)));
    return new DistrictAverageVolumesSummaryDto(
        rows, new DistrictAverageVolumeTotalsDto(totalBillable, totalCutControl));
  }

  private DistrictAverageVolumeRowDto toLegacyDistrictAverageVolumeRow(
      ca.bc.gov.nrs.hrs.dto.search.DistrictAverageVolumeLegacyDto row) {
    String harvestMethod =
        firstNonBlank(row.harvestMethodDescription(), row.harvestMethodCode());
    // OQ1=A: billable/cut-control split not stored in legacy strata; keep null (totals sum null
    // as 0).
    return new DistrictAverageVolumeRowDto(
        row.populationType(),
        row.wasteType(),
        harvestMethod,
        row.assessmentMethod(),
        row.wasteLevel(),
        row.netWasteAreaHa(),
        null,
        null);
  }

  private String firstNonBlank(String primary, String fallback) {
    if (primary != null && !primary.isBlank()) {
      return primary;
    }
    if (fallback != null && !fallback.isBlank()) {
      return fallback;
    }
    return null;
  }

  private LocalDate resolvePlcDate(LocalDate storedPlcDate) {
    return storedPlcDate != null ? storedPlcDate : LocalDate.now(clock).minusDays(1);
  }
}
