package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.audit.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
}