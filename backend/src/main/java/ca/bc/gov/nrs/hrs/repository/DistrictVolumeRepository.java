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
 * district volume and species composition business logic. All queries filter
 * out soft-deleted records (deleted = FALSE).
 */
@Repository
public interface DistrictVolumeRepository
    extends JpaRepository<DistrictVolumeEntity, Long> {

  /**
   * Finds the most recent live entry for the specified config type and area.
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.configType = :configType AND d.area = :area "
      + "AND d.deleted = FALSE ORDER BY d.startDate DESC")
  Optional<DistrictVolumeEntity> findTopByConfigTypeAndAreaOrderByStartDateDesc(
      @Param("configType") ConfigType configType, @Param("area") Area area);

  /**
   * Finds the most recent live entry for the specified config type and area (with LIMIT 1).
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.configType = :configType AND d.area = :area "
      + "AND d.deleted = FALSE ORDER BY d.startDate DESC LIMIT 1")
  Optional<DistrictVolumeEntity> findTop1ByConfigTypeAndAreaOrderByStartDateDesc(
      @Param("configType") ConfigType configType, @Param("area") Area area);

  /**
   * Retrieves a paginated list of live records filtered by area (Warning: mixes ConfigTypes).
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.area = :area AND d.deleted = FALSE")
  Page<DistrictVolumeEntity> findByArea(@Param("area") Area area, Pageable pageable);

  /**
   * Retrieves a paginated list of live records filtered by config type and area.
   *
   * @param configType config type filter
   * @param area area filter
   * @param pageable pagination and sorting information
   * @return paginated list of matching live entities
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.configType = :configType AND d.area = :area "
      + "AND d.deleted = FALSE")
  Page<DistrictVolumeEntity> findAllLiveByConfigTypeAndArea(
      @Param("configType") ConfigType configType, @Param("area") Area area,
      Pageable pageable);

  /**
   * Retrieves the currently active live record for the specified config type and area.
   */
  @Query(
      "SELECT d FROM DistrictVolumeEntity d "
          + "WHERE d.configType = :configType AND d.area = :area "
          + "AND d.deleted = FALSE AND d.startDate <= :currentDate "
          + "AND (d.endDate IS NULL OR d.endDate >= :currentDate)")
  Optional<DistrictVolumeEntity> findActiveByConfigTypeAndArea(
      @Param("configType") ConfigType configType,
      @Param("area") Area area,
      @Param("currentDate") LocalDate currentDate);

  /**
   * Retrieves the currently active live record for the specified area (Warning: mixes ConfigTypes).
   */
  @Query(
      "SELECT d FROM DistrictVolumeEntity d "
          + "WHERE d.area = :area "
          + "AND d.deleted = FALSE "
          + "AND d.startDate <= :currentDate "
          + "AND (d.endDate IS NULL OR d.endDate >= :currentDate) "
          + "ORDER BY d.startDate DESC")
  List<DistrictVolumeEntity> findActiveByArea(
      @Param("area") Area area,
      @Param("currentDate") LocalDate currentDate);

  /**
   * Finds all live open-ended entries for the specified area (Warning: mixes ConfigTypes).
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.area = :area AND d.endDate IS NULL AND d.deleted = FALSE "
      + "ORDER BY d.startDate DESC")
  List<DistrictVolumeEntity> findByAreaAndEndDateIsNullOrderByStartDateDesc(
      @Param("area") Area area);

  /**
   * Finds all live open-ended entries for the specified config type and area, ordered by most recent
   * start date first.
   *
   * @param configType config type filter
   * @param area area filter
   * @return ordered list of live open-ended entries
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.configType = :configType AND d.area = :area "
      + "AND d.endDate IS NULL AND d.deleted = FALSE "
      + "ORDER BY d.startDate DESC")
  List<DistrictVolumeEntity> findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
      @Param("configType") ConfigType configType, @Param("area") Area area);

  /**
   * Retrieves a paginated list of live records filtered by config type.
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.configType = :configType AND d.deleted = FALSE")
  Page<DistrictVolumeEntity> findAllLiveByConfigType(
      @Param("configType") ConfigType configType, Pageable pageable);

  /**
   * Retrieves a single live record by id, scoped to the specified config type.
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.id = :id AND d.configType = :configType AND d.deleted = FALSE")
  Optional<DistrictVolumeEntity> findByIdAndConfigType(
      @Param("id") Long id, @Param("configType") ConfigType configType);

  /**
   * Finds the first live row after the supplied start date.
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.configType = :configType AND d.area = :area "
      + "AND d.deleted = FALSE AND d.startDate > :startDate "
      + "ORDER BY d.startDate ASC")
  List<DistrictVolumeEntity> findFirstLiveAfter(
      @Param("configType") ConfigType configType,
      @Param("area") Area area,
      @Param("startDate") LocalDate startDate);

  /**
   * Finds the most recent live row before the supplied start date.
   */
  @Query("SELECT d FROM DistrictVolumeEntity d "
      + "WHERE d.configType = :configType AND d.area = :area "
      + "AND d.deleted = FALSE AND d.startDate < :startDate "
      + "ORDER BY d.startDate DESC")
  List<DistrictVolumeEntity> findFirstLiveBefore(
      @Param("configType") ConfigType configType,
      @Param("area") Area area,
      @Param("startDate") LocalDate startDate);
}