package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import org.springframework.stereotype.Repository;

/** Read/create repository for append-only calculation snapshots. */
@Repository
public interface BlockCalculationSnapshotRepository
    extends org.springframework.data.repository.Repository<BlockCalculationSnapshotEntity, Long> {

  BlockCalculationSnapshotEntity save(BlockCalculationSnapshotEntity entity);

  java.util.Optional<BlockCalculationSnapshotEntity> findById(Long id);
}
