package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockSponsorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block sponsors. */
@Repository
public interface BlockSponsorRepository extends JpaRepository<BlockSponsorEntity, Long> {}
