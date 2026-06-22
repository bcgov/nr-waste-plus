package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
   *         if none exists
   */
  Optional<DistrictVolumeEntity> findTopByAreaOrderByStartDateDesc(Area area);

  /**
   * Retrieves a paginated list of district volume records filtered by area.
   *
   * @param area area filter
   * @param pageable pagination and sorting information
   * @return paginated list of matching district volume entities
   */
  Page<DistrictVolumeEntity> findByArea(Area area, Pageable pageable);

  /**
   * Retrieves the currently active district volume record for the specified area.
   *
   * @param area area filter
   * @param currentDate current date used to determine whether the record is active
   * @return active district volume entity, if present
   */
  @Query(
      "SELECT d FROM DistrictVolumeEntity d "
          + "WHERE d.area = :area "
          + "AND d.startDate <= :currentDate "
          + "AND (d.endDate IS NULL OR d.endDate >= :currentDate)")
  Optional<DistrictVolumeEntity> findActiveByArea(
      @Param("area") Area area,
      @Param("currentDate") LocalDate currentDate
  );
}