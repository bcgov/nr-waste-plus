package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationDto;
import ca.bc.gov.nrs.hrs.service.block.BlockCalculationSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only endpoint for block calculation snapshots. */
@RestController
@RequestMapping("/api/blocks/{blockId}/calculation")
@RequiredArgsConstructor
public class BlockCalculationSnapshotController {

  private final BlockCalculationSnapshotService service;

  /**
   * Returns the latest calculation snapshot for the given block.
   *
   * @param blockId the block identifier
   * @return 200 with the latest snapshot, or 404 if no snapshot exists
   */
  @GetMapping
  public ResponseEntity<BlockCalculationDto> getLatest(@PathVariable Long blockId) {
    return service.findLatest(blockId)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }
}
