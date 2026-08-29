package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for reporting units. */
public interface ReportingUnitRepository extends JpaRepository<ReportingUnitEntity, Long> {}
