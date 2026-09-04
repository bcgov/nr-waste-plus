package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Date-effective formula-set access. */
public interface FormulaSetRepository extends JpaRepository<FormulaSetEntity, Long> {
  @Query("select f from FormulaSetEntity f where f.area = :area and f.deleted = false "
      + "and f.startDate <= :date and (f.endDate is null or f.endDate >= :date) "
      + "order by f.startDate desc")
  Optional<FormulaSetEntity> findEffective(@Param("area") Area area, @Param("date") LocalDate date);
  @Query("select f from FormulaSetEntity f where f.area = :area and f.deleted = false "
      + "and f.startDate > :today order by f.startDate")
  List<FormulaSetEntity> findFuture(@Param("area") Area area, @Param("today") LocalDate today);

  /** Finds a future set that would overlap a proposed future start date. */
  @Query("select f from FormulaSetEntity f where f.area = :area and f.deleted = false "
      + "and f.startDate > CURRENT_DATE and f.startDate <= :date "
      + "and (f.endDate is null or f.endDate >= :date)")
  List<FormulaSetEntity> findFutureOverlapping(@Param("area") Area area,
      @Param("date") LocalDate date);

  @Query("select f from FormulaSetEntity f where f.area = :area and f.deleted = false "
      + "and f.endDate is null and f.startDate < :date order by f.startDate desc")
  List<FormulaSetEntity> findPredecessors(@Param("area") Area area, @Param("date") LocalDate date);

  /** Finds the latest non-deleted predecessor regardless of end date, for reopening on delete. */
  @Query("select f from FormulaSetEntity f where f.area = :area and f.deleted = false "
      + "and f.startDate < :date order by f.startDate desc")
  List<FormulaSetEntity> findPredecessorForReopen(@Param("area") Area area, @Param("date") LocalDate date);
}
