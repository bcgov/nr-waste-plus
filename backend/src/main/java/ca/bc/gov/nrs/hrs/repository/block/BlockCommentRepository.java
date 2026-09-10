package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block comments. */
@Repository
public interface BlockCommentRepository extends JpaRepository<BlockCommentEntity, Long> {}
