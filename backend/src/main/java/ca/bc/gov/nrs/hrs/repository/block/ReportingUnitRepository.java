package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for reporting units. */
@Repository
public interface ReportingUnitRepository extends JpaRepository<ReportingUnitEntity, Long> {

  /** Returns the non-deleted reporting unit with the given id. */
  Optional<ReportingUnitEntity> findByIdAndDeletedFalse(Long id);
}
