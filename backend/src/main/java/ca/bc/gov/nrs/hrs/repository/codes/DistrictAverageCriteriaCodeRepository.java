package ca.bc.gov.nrs.hrs.repository.codes;

import ca.bc.gov.nrs.hrs.entity.codes.DistrictAverageCriteriaCodeEntity;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for district average criteria code lookups. */
@Repository
public interface DistrictAverageCriteriaCodeRepository
    extends JpaRepository<DistrictAverageCriteriaCodeEntity, String> {

  /**
   * Returns currently effective district average criteria codes ordered by numeric criterion code.
   *
   * @param asOf timestamp used to evaluate effective/expiry bounds
   * @return effective criteria codes in deterministic 1..11 order
   */
  @Query(
      value =
          """
          SELECT *
          FROM wasteplus.district_average_criteria_code
          WHERE effective_date <= :asOf
            AND expiry_date >= :asOf
          ORDER BY CAST(code AS INTEGER)
          """,
      nativeQuery = true)
  List<DistrictAverageCriteriaCodeEntity> findEffectiveOrderedByCode(
      @Param("asOf") LocalDateTime asOf);
}
