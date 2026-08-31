package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.DistrictAverageBlockEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for district-average block extensions. */
@Repository
public interface DistrictAverageBlockRepository
    extends JpaRepository<DistrictAverageBlockEntity, Long> {}
