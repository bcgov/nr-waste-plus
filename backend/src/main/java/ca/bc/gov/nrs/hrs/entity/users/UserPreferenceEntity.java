package ca.bc.gov.nrs.hrs.entity.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "user_preferences", schema = "hrs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceEntity {

  @Id
  private String userId;

  @Column(name = "preferences", columnDefinition = "jsonb")
  @JdbcTypeCode(SqlTypes.JSON)
  private Map<String, Object> preferences;
}
