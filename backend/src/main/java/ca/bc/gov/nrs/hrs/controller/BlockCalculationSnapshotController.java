package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationSnapshotDto;
import ca.bc.gov.nrs.hrs.service.block.BlockCalculationSnapshotService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST API for reading immutable calculation snapshots. */
@RestController
@RequestMapping("/api/blocks/{blockId}/snapshots")
@RequiredArgsConstructor
public class BlockCalculationSnapshotController {
  private final BlockCalculationSnapshotService service;

  /**
   * Lists all snapshots for a block, newest first.
   *
   * @param blockId the block identifier
   * @return ordered list of snapshots
   */
  @GetMapping
  public List<BlockCalculationSnapshotDto> list(@PathVariable Long blockId) {
    return service.findByBlockId(blockId);
  }

  /**
   * Returns the most recent snapshot for a block.
   *
   * @param blockId the block identifier
   * @return latest snapshot or 404
   */
  @GetMapping("/latest")
  public ResponseEntity<BlockCalculationSnapshotDto> latest(@PathVariable Long blockId) {
    return service.findLatestByBlockId(blockId)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /**
   * Returns a specific snapshot by identifier.
   *
   * @param blockId    the block identifier (path constraint)
   * @param snapshotId the snapshot identifier
   * @return the snapshot or 404
   */
  @GetMapping("/{snapshotId}")
  public ResponseEntity<BlockCalculationSnapshotDto> get(
      @PathVariable Long blockId, @PathVariable Long snapshotId) {
    return service.findById(snapshotId)
        .filter(s -> s.blockId().equals(blockId))
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}
