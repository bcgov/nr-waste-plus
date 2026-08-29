package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for block requirements. */
public interface BlockRequirementRepository extends JpaRepository<BlockRequirementEntity, Long> {
  List<BlockRequirementEntity> findByBlockIdAndDeletedFalse(Long blockId);
}
