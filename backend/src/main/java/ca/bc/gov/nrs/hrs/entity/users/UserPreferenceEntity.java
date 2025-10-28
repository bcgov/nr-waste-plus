package ca.bc.gov.nrs.hrs.entity.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.With;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * JPA entity that stores user preferences.
 *
 * <p>
 * Maps to the database table {@code hrs.user_preferences} and persists a
 * JSONB {@code preferences} column containing arbitrary user preference
 * key/value pairs. Preferences are represented in the application as a
 * {@link Map}&lt;String, Object&gt; to allow flexible structured values.
 * </p>
 *
 * <p>
 * The entity is auditable: {@link #updatedAt} is populated with the last
 * modification timestamp (via Spring Data auditing) and {@link #revision}
 * is used for optimistic locking.</p>
 */
@Entity
@Table(name = "user_preferences", schema = "hrs")
@Data
@Builder
@With
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"revision", "updatedAt", "preferences"})
@EntityListeners(AuditingEntityListener.class)
public class UserPreferenceEntity {

  /**
   * The user's identifier. This is the primary key for the entity and
   * corresponds to the authenticated user's id used throughout the system.
   */
  @Id
  private String userId;

  /**
   * JSONB column that stores the user's preferences as arbitrary
   * key/value pairs. Example structure: {@code { "theme": "dark", "pageSize": 25 }}.
   *
   * <p>
   * The column is declared with {@code columnDefinition = "jsonb"} and the
   * Hibernate {@link org.hibernate.type.SqlTypes#JSON} mapping via
   * {@link JdbcTypeCode} to ensure proper database storage and retrieval.
   * </p>
   */
  @Column(name = "preferences", columnDefinition = "jsonb")
  @JdbcTypeCode(SqlTypes.JSON)
  private Map<String, Object> preferences;

  /**
   * Timestamp of the last modification. Populated automatically by Spring
   * Data auditing when the row is updated.
   */
  @LastModifiedDate
  @Column(name = "updated_date")
  private LocalDateTime updatedAt;

  /**
   * Optimistic locking revision number. This value is incremented on each
   * update to protect against concurrent modifications.
   */
  @Version
  private Long revision;

}
