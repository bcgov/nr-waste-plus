package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockAreaSegmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block area segments. */
@Repository
public interface BlockAreaSegmentRepository extends JpaRepository<BlockAreaSegmentEntity, Long> {}
