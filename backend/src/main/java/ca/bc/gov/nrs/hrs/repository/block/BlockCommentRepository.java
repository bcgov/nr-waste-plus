package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for block comments. */
public interface BlockCommentRepository extends JpaRepository<BlockCommentEntity, Long> {}
