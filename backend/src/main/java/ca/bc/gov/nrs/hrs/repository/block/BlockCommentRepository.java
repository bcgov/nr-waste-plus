package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block comments. */
@Repository
public interface BlockCommentRepository extends JpaRepository<BlockCommentEntity, Long> {

  /** Finds active comments for a block. */
  List<BlockCommentEntity> findByBlockIdAndDeletedFalse(Long blockId);
}
