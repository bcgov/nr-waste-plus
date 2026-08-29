package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockSponsorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for block sponsors. */
public interface BlockSponsorRepository extends JpaRepository<BlockSponsorEntity, Long> {}
