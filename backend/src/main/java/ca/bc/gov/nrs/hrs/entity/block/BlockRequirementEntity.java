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

/** Requirement response and optional evidence link. */
@Entity
@Table(name = "block_requirement", schema = "hrs")
@Getter
@Setter
@NoArgsConstructor
public class BlockRequirementEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "block_id", nullable = false) private Long blockId;
  @Column(name = "requirement_code", nullable = false, length = 64) private String requirementCode;
  private Boolean answeredYes;
  @Column(columnDefinition = "text") private String response;
  private Long linkedAttachmentId;
  @Column(nullable = false, length = 128) private String createdBy;
  @Column(nullable = false, length = 128) private String updatedBy;
  @Column(nullable = false) private Instant createdAt;
  @Column(nullable = false) private Instant updatedAt;
  @Column(nullable = false) private boolean deleted;
}
