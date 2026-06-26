package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import java.time.LocalDate;
import java.util.List;
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
 * <p>Provides standard JPA operations together with custom queries used by
 * district volume business logic.
 */
@Repository
public interface DistrictVolumeRepository
    extends JpaRepository<DistrictVolumeEntity, Long> {

  /**
   * Finds the most recent district volume entry for the specified area.
   *
   * <p>Used to retrieve the latest configured record, regardless of whether it is the
   * currently active record or a previously active record for the same area.
   *
   * @param area area for which the latest entry should be retrieved
   * @return the most recent entry for the area, or an empty {@link Optional} if none exists
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
      @Param("currentDate") LocalDate currentDate);
  
  /**
   * Finds all open-ended district volume entries for the specified area, ordered by most recent
   * start date first.
   *
   * @param area area for which open-ended entries should be retrieved
   * @return ordered list of open-ended entries for the area
   */
  List<DistrictVolumeEntity> findByAreaAndEndDateIsNullOrderByStartDateDesc(Area area);
}