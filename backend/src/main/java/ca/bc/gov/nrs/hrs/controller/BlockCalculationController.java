package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationDto;
import ca.bc.gov.nrs.hrs.service.block.BlockCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only endpoint for block calculation snapshots. */
@RestController
@RequestMapping("/api/reporting-units/{reportingUnitId}/blocks/{blockId}/calculation")
@RequiredArgsConstructor
public class BlockCalculationController {

  private final BlockCalculationService service;

  /**
   * Returns the latest calculation snapshot for the given block.
   *
   * @param blockId the block identifier
   * @param reportingUnitId the parent reporting-unit identifier
   * @param jwt the authenticated caller's token
   * @return 200 with the latest snapshot, or 404 if no snapshot exists
   */
  @GetMapping
  public ResponseEntity<BlockCalculationDto> getLatest(
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId,
      @AuthenticationPrincipal Jwt jwt) {
    return service
        .findLatest(reportingUnitId, blockId, jwt)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }
}
