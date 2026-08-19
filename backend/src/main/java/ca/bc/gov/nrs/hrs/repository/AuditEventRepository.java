package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.audit.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link AuditEvent} rows.
 */
public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
}