package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Persists append-only district and grade support pairs. */
@Repository
@RequiredArgsConstructor
public class DistrictGradeSupportRepository {

  private static final String INSERT_SUPPORTED_PAIR =
      """
      INSERT INTO wasteplus.district_grade_support (geographic_code, grade_code)
      VALUES (?, ?)
      ON CONFLICT (geographic_code, grade_code) DO NOTHING
      """;

  private final JdbcTemplate jdbcTemplate;

  /**
   * Registers each district as historically supported by the specified area.
   *
   * <p>Unknown district codes are rejected by the database foreign key and are not suppressed.
   *
   * @param area supported grade area
   * @param districtCodes normalized, unique district codes from one configuration
   */
  public void insertSupportedPairs(Area area, List<String> districtCodes) {
    if (districtCodes.isEmpty()) {
      return;
    }

    jdbcTemplate.batchUpdate(
        INSERT_SUPPORTED_PAIR,
        districtCodes,
        districtCodes.size(),
        (preparedStatement, districtCode) -> {
          preparedStatement.setString(1, districtCode);
          preparedStatement.setString(2, area.name());
        });
  }
}
