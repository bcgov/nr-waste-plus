package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block submitters. */
@Repository
public interface BlockSubmitterRepository extends JpaRepository<BlockSubmitterEntity, Long> {

  /** Returns the first non-deleted submitter recorded for a block, if any. */
  Optional<BlockSubmitterEntity> findFirstByBlockIdAndDeletedFalseOrderById(Long blockId);
}
