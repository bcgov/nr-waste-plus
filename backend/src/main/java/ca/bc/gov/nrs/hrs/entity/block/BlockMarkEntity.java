package ca.bc.gov.nrs.hrs.entity.block;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Typed mark associated with a submission block. */
@Entity
@Table(name = "block_mark", schema = "hrs")
@Getter
@Setter
@NoArgsConstructor
public class BlockMarkEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "block_id", nullable = false) private Long blockId;
  @Column(name = "mark_type", nullable = false, length = 32) private String markType;
  @Column(name = "sequence_no", nullable = false) private Integer sequenceNo;
  @Column(nullable = false, length = 64) private String mark;
  @Column(name = "validation_status", length = 32) private String validationStatus;
  @Column(name = "forest_file_id", length = 128) private String forestFileId;
  @Column(name = "timber_mark", length = 128) private String timberMark;
  @Column(name = "cutting_permit_id", length = 128) private String cuttingPermitId;
  @Column(name = "cut_block_id", length = 128) private String cutBlockId;
  @Column(nullable = false, length = 128) private String createdBy;
  @Column(nullable = false, length = 128) private String updatedBy;
  @Column(nullable = false) private Instant createdAt;
  @Column(nullable = false) private Instant updatedAt;
  @Column(nullable = false) private boolean deleted;
}
