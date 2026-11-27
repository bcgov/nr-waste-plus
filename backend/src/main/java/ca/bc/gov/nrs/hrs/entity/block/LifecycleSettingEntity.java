package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.AuditableEntity;
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

/** Configurable lifecycle timing setting stored in {@code wasteplus.lifecycle_setting}. */
@Entity
@Table(name = "lifecycle_setting", schema = "wasteplus")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true)
public class LifecycleSettingEntity extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "lifecycle_setting_id")
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "setting_key", nullable = false, unique = true, length = 128)
  private String settingKey;

  @Column(name = "setting_value", nullable = false, length = 256)
  private String settingValue;
}
