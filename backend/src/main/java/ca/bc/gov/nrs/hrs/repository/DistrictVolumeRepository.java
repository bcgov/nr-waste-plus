package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for managing {@link DistrictVolumeEntity} records.
 *
 * <p>Provides standard CRUD operations through {@link JpaRepository} and
 * custom queries used by district volume business logic.
 */
@Repository
public interface DistrictVolumeRepository
    extends JpaRepository<DistrictVolumeEntity, Long> {

  /**
   * Finds the most recent district volume entry for the specified area.
   *
   * <p>Used when creating a new entry to determine the end date of the
   * previously active record for the same area.
   *
   * @param area area for which the latest entry should be retrieved
   * @return the most recent entry for the area, or an empty {@link Optional}
   *     if none exists
   */
  Optional<DistrictVolumeEntity> findTopByAreaOrderByStartDateDesc(Area area);
}