package ca.bc.gov.nrs.hrs.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Integration tests for {@link DistrictGradeSupportRepository}. */
@Transactional
@DisplayName("Integration Test | District Grade Support Repository")
public class DistrictGradeSupportRepositoryTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private DistrictGradeSupportRepository repository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  @DisplayName("insertSupportedPairs persists new pairs and ignores duplicates via ON CONFLICT")
  void insertSupportedPairs_persistsNewPairsAndIgnoresDuplicates() {
    repository.insertSupportedPairs(Area.INTERIOR, List.of("DCC", "DCS"));

    assertThat(countPair("DCC", Area.INTERIOR)).isEqualTo(1);
    assertThat(countPair("DCS", Area.INTERIOR)).isEqualTo(1);

    repository.insertSupportedPairs(Area.INTERIOR, List.of("DCC", "DOS"));

    assertThat(countPair("DCC", Area.INTERIOR)).isEqualTo(1);
    assertThat(countPair("DOS", Area.INTERIOR)).isEqualTo(1);
  }

  @Test
  @DisplayName("insertSupportedPairs rejects unknown district codes via foreign key constraint")
  void insertSupportedPairs_unknownDistrictCode_throwsDataIntegrityViolation() {
    assertThatThrownBy(() -> repository.insertSupportedPairs(Area.INTERIOR, List.of("ZZZ")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  @DisplayName("insertSupportedPairs with empty list is a no-op")
  void insertSupportedPairs_emptyList_isNoOp() {
    Integer beforeCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM wasteplus.district_grade_support", Integer.class);

    repository.insertSupportedPairs(Area.INTERIOR, List.of());

    Integer afterCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM wasteplus.district_grade_support", Integer.class);
    assertThat(afterCount).isEqualTo(beforeCount);
  }

  private Integer countPair(String geographicCode, Area area) {
    return jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM wasteplus.district_grade_support "
            + "WHERE geographic_code = ? AND grade_code = ?",
        Integer.class,
        geographicCode,
        area.name());
  }
}
