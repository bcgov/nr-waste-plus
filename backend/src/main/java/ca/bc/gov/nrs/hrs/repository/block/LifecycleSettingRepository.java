package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.LifecycleSettingEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Repository for {@link LifecycleSettingEntity} key/value configuration rows. */
@Repository
public interface LifecycleSettingRepository extends JpaRepository<LifecycleSettingEntity, Long> {

  /** Finds a lifecycle setting by its unique key. */
  Optional<LifecycleSettingEntity> findBySettingKey(String settingKey);
}
