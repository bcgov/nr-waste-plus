package ca.bc.gov.nrs.hrs.entity.block;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Submission block belonging to a reporting unit.
 */
@Entity
@Table(name = "block", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
public class BlockEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "reporting_unit_id", nullable = false)
  private Long reportingUnitId;

  @Column(name = "block_type", nullable = false, length = 32)
  private String blockType;

  @Column(name = "is_draft", nullable = false)
  private boolean draft = true;

  @Column(name = "plc_date")
  private LocalDate plcDate;

  @Version
  @Column(nullable = false)
  private Long revision;

  @CreatedBy
  @Column(name = "created_by", nullable = false, length = 128)
  private String createdBy;

  @LastModifiedBy
  @Column(name = "updated_by", nullable = false, length = 128)
  private String updatedBy;

  @CreatedDate
  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @LastModifiedDate
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Column(nullable = false)
  private boolean deleted;
}
