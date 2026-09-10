package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.SoftDeletableAuditableEntity;
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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Comment associated with a submission block.
 */
@Entity
@Table(name = "block_comment", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true, exclude = "comment")
public class BlockCommentEntity extends SoftDeletableAuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "block_comment_id")
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "block_id", nullable = false)
  private Long blockId;

  @Column(nullable = false, length = 32)
  private String context;

  @Column(nullable = false, length = 4000)
  private String comment;

  private Long statusEventId;
}
