package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.audit.AuditChange;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditChangeRepository extends JpaRepository<AuditChange, Long> {
}