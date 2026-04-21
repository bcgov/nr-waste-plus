package ca.bc.gov.nrs.hrs.entity.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.With;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * JPA entity that stores bookmarked reporting units for users.
 *
 * <p>
 * Maps to {@code hrs.user_bookmarks}. The table uses a composite primary key
 * made of {@link #userId} and {@link #reportingUnitId}, allowing each user to
 * bookmark multiple reporting units while preventing duplicate bookmarks for
 * the same user/reporting-unit pair.
 * </p>
 */
@Entity
@Table(name = "user_bookmarks", schema = "hrs")
@IdClass(UserBookmarkEntityId.class)
@Data
@Builder
@With
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class UserBookmarkEntity {

  /**
   * Unique identifier for the user who owns the bookmark.
   * Part of the composite primary key.
   */
  @Id
  @Column(name = "user_id", nullable = false, length = 70)
  @EqualsAndHashCode.Include
  private String userId;

  /**
   * Identifier of the bookmarked reporting unit.
   * Part of the composite primary key.
   */
  @Id
  @Column(name = "reporting_unit_id", nullable = false)
  @EqualsAndHashCode.Include
  private Long reportingUnitId;
}
