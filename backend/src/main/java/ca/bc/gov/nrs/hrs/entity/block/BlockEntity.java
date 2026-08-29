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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Submission block belonging to a reporting unit. */
@Entity
@Table(name = "block", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class BlockEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
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
  @Column(name = "created_by", nullable = false, length = 128)
  private String createdBy;
  @Column(name = "updated_by", nullable = false, length = 128)
  private String updatedBy;
  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
  @Column(nullable = false)
  private boolean deleted;
}
