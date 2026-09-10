package ca.bc.gov.nrs.hrs.entity.reliability;

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

/** Request record used by a future idempotency-key workflow. */
@Entity
@Table(name = "idempotency_record", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true, exclude = "responseSnapshot")
public class IdempotencyRecordEntity extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "idempotency_record_id")
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "idempotency_key", nullable = false, unique = true, length = 256)
  private String idempotencyKey;

  @Column(name = "request_fingerprint", nullable = false, length = 128)
  private String requestFingerprint;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "response_status")
  private Integer responseStatus;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "response_snapshot", columnDefinition = "jsonb")
  private JsonNode responseSnapshot;
}
