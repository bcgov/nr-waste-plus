package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockDetailDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockListItemDto;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.service.ReportingUnitBlockService;
import ca.bc.gov.nrs.hrs.service.block.BlockCalculationService;
import ca.bc.gov.nrs.hrs.service.block.BlockService;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller exposing block endpoints nested under a reporting unit.
 *
 * <p>Provides HTTP endpoints for retrieving a single block's details, listing the blocks of a
 * reporting unit, and reading the latest calculation snapshot for a block. Block details are
 * resolved from postgres when the reporting unit lives there and fall back to the legacy API
 * otherwise, mirroring the reporting-unit details behaviour.
 *
 * <p>The details endpoint is gated behind {@link FeatureFlag#REPORTING_UNIT_BLOCK_DETAILS_ENABLED}.
 * When the flag is disabled the controller responds with HTTP 404 so the feature remains invisible
 * to callers. The block-list and calculation endpoints are not flag-gated.
 */
@RestController
@RequestMapping("/api/reporting-units")
@RequiredArgsConstructor
@Slf4j
@Observed
public class BlockController {

  private final BlockService blockService;
  private final ReportingUnitBlockService reportingUnitBlockService;
  private final BlockCalculationService blockCalculationService;
  private final FeatureFlagsConfiguration featureFlagsConfiguration;

  /**
   * Retrieve the details of a block owned by a reporting unit.
   *
   * <p>Delegates to {@link BlockService} to resolve the block from postgres or the legacy API. The
   * response carries an {@code isLegacy} marker identifying the store of origin.
   *
   * <p>Returns HTTP 404 when {@link FeatureFlag#REPORTING_UNIT_BLOCK_DETAILS_ENABLED} is disabled,
   * when the reporting unit does not exist in the owning store, or when the block does not belong
   * to the reporting unit.
   *
   * <p>Validates that the authenticated user has permission to access the block's reporting unit.
   * For BCeID business users, validates that the owning client number matches one of the user's
   * authorized client numbers. IDIR and BCSC users bypass the client-level check.
   *
   * @param jwt the JWT principal for the authenticated caller
   * @param reportingUnitId the owning reporting-unit identifier
   * @param blockId the block identifier
   * @return a {@link BlockDetailDto} containing the block's details and source marker
   * @throws NotFoundGenericException when the feature flag is disabled or the block cannot be found
   */
  @GetMapping("/{reportingUnitId}/{blockId}")
  public BlockDetailDto getBlockDetails(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId) {

    if (!featureFlagsConfiguration.isEnabled(FeatureFlag.REPORTING_UNIT_BLOCK_DETAILS_ENABLED)) {
      throw new NotFoundGenericException("reporting-unit-block-details");
    }

    log.info("Fetching details for block {} of RU {}", blockId, reportingUnitId);

    return blockService.getBlockDetails(reportingUnitId, blockId, jwt);
  }

  /**
   * Retrieve the block list for a reporting unit.
   *
   * <p>Returns a single page of block rows assembled either from the postgres block tables or from
   * the legacy API, depending on where the reporting unit lives. Unlike the details endpoint this
   * endpoint is not gated behind {@link FeatureFlag#REPORTING_UNIT_BLOCK_DETAILS_ENABLED}.
   *
   * <p>Validates that the authenticated user has permission to access the reporting unit's blocks.
   * For BCeID business users, validates that the owning client number matches one of the user's
   * authorized client numbers. IDIR and BCSC users bypass the client-level check.
   *
   * @param jwt the JWT principal for the authenticated caller
   * @param reportingUnitId the unique identifier of the reporting unit
   * @return a single page of block rows; never null
   * @throws ResponseStatusException with HTTP 403 if a BCeID caller is scoped to a different
   *     client than the reporting unit's owner
   */
  @GetMapping("/{reportingUnitId}/blocks")
  public Page<BlockListItemDto> getReportingUnitBlocks(
      @AuthenticationPrincipal Jwt jwt, @PathVariable Long reportingUnitId) {
    log.info("Fetching blocks for reporting unit {}", reportingUnitId);

    return reportingUnitBlockService.getBlockList(reportingUnitId, jwt);
  }

  /**
   * Returns the latest calculation snapshot for the given block.
   *
   * @param blockId the block identifier
   * @param reportingUnitId the parent reporting-unit identifier
   * @param jwt the authenticated caller's token
   * @return 200 with the latest snapshot, or 404 if no snapshot exists
   */
  @GetMapping("/{reportingUnitId}/{blockId}/calculation")
  public ResponseEntity<BlockCalculationDto> getLatest(
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId,
      @AuthenticationPrincipal Jwt jwt) {
    return blockCalculationService
        .findLatest(reportingUnitId, blockId, jwt)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }
}
