package ca.bc.gov.nrs.hrs.repository;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@DisplayName("Integration Test | Reporting unit block native query")
class ReportingUnitBlockRepositoryIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final long SEEDED_REPORTING_UNIT_ID = 879L;

  @Autowired private ReportingUnitRepository reportingUnitRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  @Test
  @DisplayName("shouldReturnNativeBlockProjectionValues_inIdOrder")
  void shouldReturnNativeBlockProjectionValues_inIdOrder() {
    var result = reportingUnitRepository.getReportingUnitBlocks(SEEDED_REPORTING_UNIT_ID);

    assertThat(result).isNotEmpty();
    assertThat(result).extracting("id").containsExactly(1905L, 1906L);
    assertThat(result.getFirst().getLicenseNumber()).isEqualTo("R21110");
    assertThat(result.getFirst().getCutBlockId()).isNull();
    assertThat(result.getFirst().getStatusCode()).isEqualTo("DFT");
    assertThat(result.get(1).getLicenseNumber()).isEqualTo("A74531");
    assertThat(result.get(1).getCuttingPermit()).isEqualTo("9");
    assertThat(result.get(1).getTimberMark()).isEqualTo("JY1009");
    assertThat(result.get(1).getTotalWasteAreaHa()).isEqualByComparingTo("27.02");
    assertThat(result.get(1).getStatusCode()).isEqualTo("RTB");
    assertThat(result.get(1).getLastUpdated())
        .isEqualTo(java.time.LocalDateTime.parse("2026-02-10T09:07:54"));
  }

  @Test
  @DisplayName("shouldReturnNoBlockRows_whenReportingUnitHasNoAssessmentAreas")
  void shouldReturnNoBlockRows_whenReportingUnitHasNoAssessmentAreas() {
    Long reportingUnitId = 900000L;
    assertThat(reportingUnitRepository.getReportingUnitBlocks(999999999L)).isEmpty();
  }
}
