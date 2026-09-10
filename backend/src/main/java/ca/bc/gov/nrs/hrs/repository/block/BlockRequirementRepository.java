package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for block requirements. */
@Repository
public interface BlockRequirementRepository extends JpaRepository<BlockRequirementEntity, Long> {
  List<BlockRequirementEntity> findByBlockIdAndDeletedFalse(Long blockId);
}
