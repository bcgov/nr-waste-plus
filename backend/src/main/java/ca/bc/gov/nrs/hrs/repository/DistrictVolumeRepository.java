package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DistrictVolumeRepository 
    extends JpaRepository<DistrictVolumeEntity, Long> {

  // Used to derive end_date when a new entry for the same area is saved.
  // Note: parameter type is Area (enum), not String — matches @Enumerated(EnumType.STRING) field.
  Optional<DistrictVolumeEntity> findTopByAreaOrderByStartDateDesc(Area area);
}
