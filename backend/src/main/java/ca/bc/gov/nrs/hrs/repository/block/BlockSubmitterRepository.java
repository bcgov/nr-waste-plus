package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for block submitters. */
public interface BlockSubmitterRepository extends JpaRepository<BlockSubmitterEntity, Long> {}
