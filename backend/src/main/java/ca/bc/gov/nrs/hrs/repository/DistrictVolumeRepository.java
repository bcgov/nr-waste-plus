package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
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
 * district volume and species composition business logic.
 */
@Repository
public interface DistrictVolumeRepository
    extends JpaRepository<DistrictVolumeEntity, Long> {

  /**
   * Finds the most recent entry for the specified config type and area.
   */
  Optional<DistrictVolumeEntity> findTopByConfigTypeAndAreaOrderByStartDateDesc(ConfigType configType, Area area);

  /**
   * Retrieves a paginated list of records filtered by area (Warning: mixes ConfigTypes).
   */
  Page<DistrictVolumeEntity> findByArea(Area area, Pageable pageable);

  /**
   * Retrieves a paginated list of records filtered by config type and area.
   *
   * @param configType config type filter
   * @param area area filter
   * @param pageable pagination and sorting information
   * @return paginated list of matching entities
   */
  Page<DistrictVolumeEntity> findAllByConfigTypeAndArea(ConfigType configType, Area area, Pageable pageable);

  /**
   * Retrieves the currently active record for the specified config type and area.
   */
  @Query(
      "SELECT d FROM DistrictVolumeEntity d "
          + "WHERE d.configType = :configType "
          + "AND d.area = :area "
          + "AND d.startDate <= :currentDate "
          + "AND (d.endDate IS NULL OR d.endDate >= :currentDate)")
  Optional<DistrictVolumeEntity> findActiveByConfigTypeAndArea(
      @Param("configType") ConfigType configType,
      @Param("area") Area area,
      @Param("currentDate") LocalDate currentDate);

  /**
   * Retrieves the currently active record for the specified area (Warning: mixes ConfigTypes).
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
   * Finds all open-ended entries for the specified area (Warning: mixes ConfigTypes).
   */
  List<DistrictVolumeEntity> findByAreaAndEndDateIsNullOrderByStartDateDesc(Area area);

  /**
   * Finds all open-ended entries for the specified config type and area, ordered by most recent
   * start date first.
   *
   * @param configType config type filter
   * @param area area filter
   * @return ordered list of open-ended entries
   */
  List<DistrictVolumeEntity> findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(ConfigType configType, Area area);

  /**
   * Retrieves a paginated list of records filtered by config type.
   */
  Page<DistrictVolumeEntity> findAllByConfigType(ConfigType configType, Pageable pageable);

  /**
   * Retrieves a single record by id, scoped to the specified config type.
   */
  Optional<DistrictVolumeEntity> findByIdAndConfigType(Long id, ConfigType configType);

}