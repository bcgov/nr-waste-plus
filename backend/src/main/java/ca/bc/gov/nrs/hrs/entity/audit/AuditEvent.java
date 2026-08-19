package ca.bc.gov.nrs.hrs.entity.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

/**
 * Immutable audit event grouping one temporal mutation operation.
 */
@Entity
@Table(name = "audit_event", schema = "hrs")
@Getter
public class AuditEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 32)
  private String action;

  @Column(name = "changed_by", nullable = false, length = 128)
  private String changedBy;

  @Column(name = "changed_at", nullable = false, columnDefinition = "TIMESTAMPTZ DEFAULT NOW()")
  private Instant changedAt;

  @Column(length = 500)
  private String reason;

  @Column(name = "correlation_id", length = 128)
  private String correlationId;

  protected AuditEvent() {}

  /**
   * Creates an audit event for one mutation operation.
   *
   * @param action the mutation action
   * @param changedBy the user who performed the mutation
   * @param reason the reason for the mutation
   * @param correlationId a correlation id linking related audit events
   */
  public AuditEvent(String action, String changedBy, String reason, String correlationId) {
    this.action = action;
    this.changedBy = changedBy;
    this.changedAt = Instant.now();
    this.reason = reason;
    this.correlationId = correlationId;
  }
}