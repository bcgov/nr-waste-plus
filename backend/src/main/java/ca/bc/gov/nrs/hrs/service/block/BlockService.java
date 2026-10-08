package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.BlockDetailDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.mapper.block.BlockMapper;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Read service for individual block details.
 *
 * <p>Blocks live in two places: reporting units persisted in postgres are resolved against the
 * block tables, while everything else is delegated to the legacy API through {@link
 * LegacyApiProvider}. The resolved {@link BlockDetailDto} carries an {@code isLegacy} marker so
 * callers can tell which store served the block.
 *
 * <p>Client scoping mirrors {@link BlockCalculationService}: BUSINESS_BCEID callers must hold a
 * viewer or submitter role for the owning client number; IDIR and BCSC callers are unrestricted.
 * The owning client is resolved from the postgres reporting-unit record on the postgres path and
 * from the legacy reporting-unit details on the legacy path.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BlockService {

  private static final String DRAFT_STATUS_CODE = "DFT";

  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final LegacyApiProvider legacyApiProvider;
  private final BlockMapper blockMapper;

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
  public BlockDetailDto getBlockDetails(Long reportingUnitId, Long blockId, Jwt jwt) {
    return reportingUnitRepository
        .findByIdAndDeletedFalse(reportingUnitId)
        .map(
            reportingUnit ->
                getPostgresBlockDetails(
                    reportingUnitId, blockId, jwt, reportingUnit.getClientNumber()))
        .orElseGet(() -> getLegacyBlockDetails(reportingUnitId, blockId, jwt));
  }

  private BlockDetailDto getPostgresBlockDetails(
      Long reportingUnitId, Long blockId, Jwt jwt, String clientNumber) {
    enforceClientScope(jwt, reportingUnitId, clientNumber);

    BlockEntity block =
        blockRepository
            .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
            .orElseThrow(() -> new NotFoundGenericException("Block", String.valueOf(blockId)));

    return blockMapper.toDetailDto(block);
  }

  private BlockDetailDto getLegacyBlockDetails(Long reportingUnitId, Long blockId, Jwt jwt) {
    var legacyReportingUnit = legacyApiProvider.getReportingUnitDetails(reportingUnitId);

    enforceClientScope(jwt, reportingUnitId, legacyReportingUnit.clientNumber());

    BlockListItemDto legacyRow =
        legacyApiProvider.getReportingUnitBlocks(reportingUnitId).stream()
            .filter(row -> row.id() != null && row.id().equals(blockId))
            .findFirst()
            .orElseThrow(() -> new NotFoundGenericException("Block", String.valueOf(blockId)));

    return toLegacyDetailDto(reportingUnitId, legacyRow);
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

  /**
   * Map a legacy block-list row to the details contract.
   *
   * <p>The legacy row only carries the block identifier and lifecycle status. Draft state is
   * derived from the {@code DFT} status code; every other non-identifier field is null and the
   * legacy marker is {@code true}.
   */
  private BlockDetailDto toLegacyDetailDto(Long reportingUnitId, BlockListItemDto row) {
    boolean draft =
        row.status() != null && DRAFT_STATUS_CODE.equals(row.status().code());
    return new BlockDetailDto(row.id(), reportingUnitId, null, draft, null, null, true);
  }
}
