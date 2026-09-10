package ca.bc.gov.nrs.hrs.entity.block;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
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
 * Typed mark associated with a submission block.
 */
@Entity
@Table(name = "block_mark", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
public class BlockMarkEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "block_id", nullable = false)
  private Long blockId;

  @Column(name = "mark_type", nullable = false, length = 32)
  private String markType;

  @Column(name = "sequence_no", nullable = false)
  private Integer sequenceNo;

  @Column(nullable = false, length = 64)
  private String mark;

  @Column(name = "validation_status", length = 32)
  private String validationStatus;

  @Column(name = "forest_file_id", length = 128)
  private String forestFileId;

  @Column(name = "timber_mark", length = 128)
  private String timberMark;

  @Column(name = "cutting_permit_id", length = 128)
  private String cuttingPermitId;

  @Column(name = "cut_block_id", length = 128)
  private String cutBlockId;

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

  @Column(nullable = false)
  private boolean deleted;
}
