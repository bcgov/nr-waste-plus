package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.SoftDeletableAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Submission block belonging to a reporting unit. */
@Entity
@Table(name = "block", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true)
public class BlockEntity extends SoftDeletableAuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "block_id")
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
}
