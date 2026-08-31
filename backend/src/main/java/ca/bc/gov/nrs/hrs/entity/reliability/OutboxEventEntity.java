package ca.bc.gov.nrs.hrs.entity.reliability;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Transactional event waiting for reliable delivery. */
@Entity
@Table(name = "outbox_event", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"payload", "attemptHistory"})
public class OutboxEventEntity {

  /** Creates an empty entity for JPA and incremental construction. */
  public OutboxEventEntity() {
    // Required by JPA; attemptHistory uses its field initializer.
  }

  /** Creates an entity with all persisted values. */
  public OutboxEventEntity(
      Long id, UUID eventId, String aggregateType, Long aggregateId, String eventType,
      JsonNode payload, String status, Integer attemptCount, JsonNode attemptHistory,
      Instant nextRetryAt, Instant lockedUntil, String lockedBy, String createdBy, String updatedBy,
      Instant createdAt, Instant updatedAt) {
    this.id = id;
    this.eventId = eventId;
    this.aggregateType = aggregateType;
    this.aggregateId = aggregateId;
    this.eventType = eventType;
    this.payload = payload;
    this.status = status;
    this.attemptCount = attemptCount;
    this.attemptHistory = attemptHistory;
    this.nextRetryAt = nextRetryAt;
    this.lockedUntil = lockedUntil;
    this.lockedBy = lockedBy;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /** Returns the event payload. */
  public JsonNode getPayload() {
    return payload;
  }

  /** Sets the event payload. */
  public void setPayload(JsonNode payload) {
    this.payload = payload;
  }

  /** Returns the delivery attempt history. */
  public JsonNode getAttemptHistory() {
    return attemptHistory;
  }

  /** Sets the delivery attempt history. */
  public void setAttemptHistory(JsonNode attemptHistory) {
    this.attemptHistory = attemptHistory;
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "event_id", nullable = false, unique = true)
  private UUID eventId;

  @Column(name = "aggregate_type", nullable = false, length = 64)
  private String aggregateType;

  @Column(name = "aggregate_id", nullable = false)
  private Long aggregateId;

  @Column(name = "event_type", nullable = false, length = 128)
  private String eventType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private JsonNode payload;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "attempt_count", nullable = false)
  private Integer attemptCount;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "attempt_history", nullable = false, columnDefinition = "jsonb")
  private JsonNode attemptHistory = JsonNodeFactory.instance.arrayNode();

  @Column(name = "next_retry_at", nullable = false)
  private Instant nextRetryAt;

  @Column(name = "locked_until")
  private Instant lockedUntil;

  @Column(name = "locked_by", length = 128)
  private String lockedBy;

  @CreatedBy
  @Column(nullable = false, length = 128)
  private String createdBy;

  @LastModifiedBy
  @Column(nullable = false, length = 128)
  private String updatedBy;

  @CreatedDate
  @Column(nullable = false)
  private Instant createdAt;

  @LastModifiedDate
  @Column(nullable = false)
  private Instant updatedAt;

  /** Validates JSON fields that are non-nullable in the V1.1.4 schema. */
  @PrePersist
  @PreUpdate
  void validateRequiredJsonFields() {
    if (payload == null) {
      throw new IllegalStateException("Outbox event payload must be provided");
    }
    if (attemptHistory == null) {
      throw new IllegalStateException("Outbox event attempt history must be provided");
    }
  }
}
