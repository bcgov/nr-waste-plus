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

  @Id
  private String userId;

  @Column(name = "preferences", columnDefinition = "jsonb")
  @JdbcTypeCode(SqlTypes.JSON)
  private Map<String, Object> preferences;

  @LastModifiedDate
  @Column(name = "updated_date")
  private LocalDateTime updatedAt;

  @Version
  private Long revision;

}
