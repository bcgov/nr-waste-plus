package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockType;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.DuplicateBlockException;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitStateConflictException;
import ca.bc.gov.nrs.hrs.mapper.block.BlockMapper;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.sql.SQLException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
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

  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final StatusEventRepository statusEventRepository;
  private final LegacyApiProvider legacyApiProvider;
  private final BlockMapper blockMapper;

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
  public BlockEntity create(Jwt jwt, Long reportingUnitId, BlockType blockType) {
    return create(jwt, reportingUnitId, blockType, null);
  }

  /**
   * Creates a new submission block without JWT tenant scoping.
   *
   * @param reportingUnitId target reporting unit
   * @param blockType block subtype to create
   * @return newly created and persisted block entity
   */
  public BlockEntity create(Long reportingUnitId, BlockType blockType) {
    return create(null, reportingUnitId, blockType, null);
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
   * Retrieves a non-deleted block that belongs to the specified reporting unit without JWT tenant scoping.
   *
   * @param reportingUnitId owning reporting unit
   * @param blockId target block identifier
   * @return the owned block entity
   */
  public BlockEntity getOwned(Long reportingUnitId, Long blockId) {
    return getOwned(null, reportingUnitId, blockId);
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
    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    return blockRepository.findAllByReportingUnitIdAndDeletedFalseOrderByIdAsc(reportingUnitId);
  }

  /**
   * Retrieves all non-deleted blocks for a reporting unit ordered by ID ascending without JWT scoping.
   *
   * @param reportingUnitId target reporting unit
   * @return list of non-deleted blocks
   */
  public List<BlockEntity> findAllByReportingUnitId(Long reportingUnitId) {
    return findAllByReportingUnitId(null, reportingUnitId);
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

    return blockMapper.toResponseDto(block);
  }

  private BlockResponseDto getLegacyBlockDetails(Long reportingUnitId, Long blockId, Jwt jwt) {
    var legacyReportingUnit = legacyApiProvider.getReportingUnitDetails(reportingUnitId);

    BlockListItemDto legacyRow =
        legacyApiProvider.getReportingUnitBlocksStrict(reportingUnitId).stream()
            .filter(row -> row.id() != null && row.id().equals(blockId))
            .findFirst()
            .orElseThrow(() -> new NotFoundGenericException("Block", String.valueOf(blockId)));

    enforceClientScope(jwt, reportingUnitId, legacyReportingUnit.clientNumber());

    return toLegacyResponseDto(reportingUnitId, legacyRow);
  }

  /**
   * Enforce owning-client scoping for a reporting-unit-scoped read.
   *
   * <p>Shared by the block details, block list and calculation reads so every reporting-unit
   * endpoint applies the same rule: BUSINESS_BCEID callers must hold a viewer or submitter role
   * for the owning client number; IDIR and BCSC callers are unrestricted.
   *
   * @param jwt the authenticated caller's token
   * @param reportingUnitId the reporting unit being read
   * @param clientNumber the owning client number resolved by the caller
   * @throws ResponseStatusException with HTTP 403 if a BCeID caller is scoped to a different
   *     client than the block's owner
   */
  public void enforceClientScope(Jwt jwt, Long reportingUnitId, String clientNumber) {
    if (IdentityProvider.BUSINESS_BCEID.equals(JwtPrincipalUtil.getIdentityProvider(jwt))
        && !hasClientRole(jwt, clientNumber)) {
      log.warn(
          "SECURITY: BCeID user {} attempted unauthorized access to block details for RU {}",
          JwtPrincipalUtil.getUserId(jwt),
          reportingUnitId);
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "User is not authorized to access reporting unit: " + reportingUnitId);
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
   * legacy marker is {@code true}.
   */
  private BlockResponseDto toLegacyResponseDto(Long reportingUnitId, BlockListItemDto row) {
    boolean draft =
        row.status() != null && DRAFT_STATUS_CODE.equals(row.status().code());
    String state = draft ? "DRAFT" : "ACTIVE";
    return new BlockResponseDto(
        row.id(),
        reportingUnitId,
        null,
        state,
        draft,
        null,
        null,
        null,
        true,
        null,
        null);
  }
}
