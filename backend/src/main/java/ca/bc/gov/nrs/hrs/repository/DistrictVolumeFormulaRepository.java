package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeFormulaEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence operations for normalized district-volume formulas. */
public interface DistrictVolumeFormulaRepository
    extends JpaRepository<DistrictVolumeFormulaEntity, Long> {

  /** Finds formulas from the latest live district-volume version before a target version. */
  @Query("""
      select f from DistrictVolumeFormulaEntity f
      join fetch f.districtVolume d
      where d.area = :area and d.configType = 'DISTRICT_VOLUME'
        and d.deleted = false and d.startDate < :startDate
        and d.startDate = (
          select max(previous.startDate) from DistrictVolumeEntity previous
          where previous.area = :area and previous.configType = 'DISTRICT_VOLUME'
            and previous.deleted = false and previous.startDate < :startDate)
      order by f.sortOrder asc, f.id asc
      """)
  List<DistrictVolumeFormulaEntity> findForPriorVersion(
      @Param("area") ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area area,
      @Param("startDate") LocalDate startDate);

  /** Finds formulas belonging to one district-volume version in stable display order. */
  List<DistrictVolumeFormulaEntity> findByDistrictVolumeIdOrderBySortOrderAscIdAsc(Long id);
}
