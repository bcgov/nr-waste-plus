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

/** Evidence attachment metadata for a block. */
@Entity
@Table(name = "block_attachment", schema = "hrs")
@Getter
@Setter
@NoArgsConstructor
public class BlockAttachmentEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "block_id", nullable = false) private Long blockId;
  @Column(name = "object_key", nullable = false, length = 512) private String objectKey;
  @Column(name = "file_name", length = 255) private String fileName;
  @Column(name = "content_type", length = 128) private String contentType;
  private Long fileSizeBytes;
  @Column(name = "scan_status", nullable = false, length = 32) private String scanStatus;
  @Column(nullable = false, length = 128) private String createdBy;
  @Column(nullable = false, length = 128) private String updatedBy;
  @Column(nullable = false) private Instant createdAt;
  @Column(nullable = false) private Instant updatedAt;
  @Column(nullable = false) private boolean deleted;
}
