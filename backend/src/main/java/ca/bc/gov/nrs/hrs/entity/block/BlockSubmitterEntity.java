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
 * Submitter endorsement details for a block.
 */
@Entity
@Table(name = "block_submitter", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
public class BlockSubmitterEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "block_id", nullable = false)
  private Long blockId;

  @Column(name = "submitter_id", nullable = false, length = 128)
  private String submitterId;

  @Column(name = "submitter_name", length = 255)
  private String submitterName;

  @Column(name = "first_name", length = 128)
  private String firstName;

  @Column(name = "last_name", length = 128)
  private String lastName;

  @Column(length = 128)
  private String designation;

  @Column(name = "licence_no", length = 128)
  private String licenceNo;

  @Column(length = 320)
  private String email;

  @Column(length = 64)
  private String phone;

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
