package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block marks. */
@Repository
public interface BlockMarkRepository extends JpaRepository<BlockMarkEntity, Long> {
  List<BlockMarkEntity> findByBlockIdAndMarkTypeOrderBySequenceNo(Long blockId, String markType);

  /** Returns non-deleted marks of the given type for a block in sequence order. */
  List<BlockMarkEntity> findByBlockIdAndMarkTypeAndDeletedFalseOrderBySequenceNo(
      Long blockId, String markType);
}
