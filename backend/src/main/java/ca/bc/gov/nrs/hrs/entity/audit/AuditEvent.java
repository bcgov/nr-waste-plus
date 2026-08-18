package ca.bc.gov.nrs.hrs.entity.audit;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Immutable audit event grouping one temporal mutation operation.
 */
@Entity
@Table(name = "audit_event", schema = "hrs")
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

  public AuditEvent(String action, String changedBy, String reason, String correlationId) {
    this.action = action;
    this.changedBy = changedBy;
    this.changedAt = Instant.now();
    this.reason = reason;
    this.correlationId = correlationId;
  }

  public Long getId() { return id; }
  public String getAction() { return action; }
  public String getChangedBy() { return changedBy; }
  public Instant getChangedAt() { return changedAt; }
  public String getReason() { return reason; }
  public String getCorrelationId() { return correlationId; }
}