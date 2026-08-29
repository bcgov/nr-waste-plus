package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import org.springframework.data.repository.Repository;

/** Read/create repository for append-only calculation snapshots. */
public interface BlockCalculationSnapshotRepository
    extends Repository<BlockCalculationSnapshotEntity, Long> {

  BlockCalculationSnapshotEntity save(BlockCalculationSnapshotEntity entity);

  java.util.Optional<BlockCalculationSnapshotEntity> findById(Long id);
}
