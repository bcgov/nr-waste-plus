package ca.bc.gov.nrs.hrs.entity.reliability;

import ca.bc.gov.nrs.hrs.entity.AuditableEntity;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Transactional event waiting for reliable delivery. Attempt history defaults to an empty JSON
 * array, while payload must be supplied explicitly; required JSON fields are validated before
 * persistence.
 */
@Entity
@Table(name = "outbox_event", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(
    callSuper = true,
    exclude = {"payload", "attemptHistory"})
public class OutboxEventEntity extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "outbox_event_id")
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
