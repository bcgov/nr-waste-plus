package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for submission blocks. */
@Repository
public interface BlockRepository extends JpaRepository<BlockEntity, Long> {
  Optional<BlockEntity> findByReportingUnitIdAndDeletedFalse(Long reportingUnitId);
}
