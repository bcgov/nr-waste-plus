package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.AuditableEntity;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Append-only lifecycle event for a reporting unit or block. */
@Entity
@Table(name = "status_event", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true, exclude = "details")
public class StatusEventEntity extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "status_event_id")
  @EqualsAndHashCode.Include
  private Long id;

  private Long reportingUnitId;

  private Long blockId;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "event_type", nullable = false, length = 64)
  private String eventType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private JsonNode details;
}
