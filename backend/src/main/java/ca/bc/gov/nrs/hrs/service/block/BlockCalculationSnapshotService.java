package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationSnapshotDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import ca.bc.gov.nrs.hrs.mapper.block.BlockCalculationSnapshotMapper;
import ca.bc.gov.nrs.hrs.repository.block.BlockCalculationSnapshotRepository;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Read-only service for immutable calculation snapshots. */
@Service
@RequiredArgsConstructor
public class BlockCalculationSnapshotService {
  private final BlockCalculationSnapshotRepository repository;
  private final BlockCalculationSnapshotMapper mapper;

  /**
   * Returns all snapshots for a block, ordered by calculatedAt descending.
   *
   * @param blockId the block identifier
   * @return snapshots in newest-first order
   */
  public List<BlockCalculationSnapshotDto> findByBlockId(Long blockId) {
    return repository.findByBlockIdOrderByCalculatedAtDesc(blockId).stream()
        .map(mapper::toDto)
        .toList();
  }

  /**
   * Returns a specific snapshot by identifier.
   *
   * @param snapshotId the snapshot identifier
   * @return the snapshot if found
   */
  public Optional<BlockCalculationSnapshotDto> findById(Long snapshotId) {
    return repository.findById(snapshotId).map(mapper::toDto);
  }

  /**
   * Returns the most recent snapshot for a block.
   *
   * @param blockId the block identifier
   * @return the latest snapshot if any exist
   */
  public Optional<BlockCalculationSnapshotDto> findLatestByBlockId(Long blockId) {
    List<BlockCalculationSnapshotEntity> snapshots =
        repository.findByBlockIdOrderByCalculatedAtDesc(blockId);
    return snapshots.isEmpty()
        ? Optional.empty()
        : Optional.of(mapper.toDto(snapshots.getFirst()));
  }
}
