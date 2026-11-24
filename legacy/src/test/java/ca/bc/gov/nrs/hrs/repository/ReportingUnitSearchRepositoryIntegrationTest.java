package ca.bc.gov.nrs.hrs.repository;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

@DisplayName("Integration Test | Reporting unit search native query")
class ReportingUnitSearchRepositoryIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired private ReportingUnitRepository reportingUnitRepository;

  @Test
  @DisplayName("applies reporting unit, client, sampling, status, and license filters together")
  void shouldApplyMultipleSearchFilters() {
    ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto()
        .withMainSearchTerm("879")
        .withClientNumbers(List.of("00001271"))
        .withSampling(List.of("AGR"))
        .withStatus(List.of("RTB"))
        .withLicenseeId("A74531");

    var results = reportingUnitRepository.searchReportingUnits(filters, PageRequest.of(0, 10));

    assertThat(results.getContent()).hasSize(1);
    var result = results.getContent().getFirst();
    assertThat(result.getRuNumber()).isEqualTo(879L);
    assertThat(result.getClientNumber()).isEqualTo("00001271");
    assertThat(result.getSamplingCode()).isEqualTo("AGR");
    assertThat(result.getStatusCode()).isEqualTo("RTB");
    assertThat(result.getLicenseNumber()).isEqualTo("A74531");
    assertThat(results.getTotalElements()).isEqualTo(1);
  }

  @Test
  @DisplayName("does not return reporting units outside the requested client scope")
  void shouldEnforceClientFilter() {
    ReportingUnitSearchParametersDto filters = new ReportingUnitSearchParametersDto()
        .withMainSearchTerm("879")
        .withClientNumbers(List.of("99999999"));

    var results = reportingUnitRepository.searchReportingUnits(filters, PageRequest.of(0, 10));

    assertThat(results.getContent()).isEmpty();
    assertThat(results.getTotalElements()).isZero();
  }

  @Test
  @DisplayName("resolves reporting unit IDs for primary, draft, lowercase, and child timber marks")
  void shouldFindReportingUnitIdsByTimberMark() {
    List<Long> er9210Ids = reportingUnitRepository.findReportingUnitIdsByTimberMark("ER9210")
        .stream()
        .map(Number::longValue)
        .toList();
    assertThat(er9210Ids).containsExactly(36301L);

    List<Long> lowercaseIds = reportingUnitRepository.findReportingUnitIdsByTimberMark("jy1009")
        .stream()
        .map(Number::longValue)
        .toList();
    assertThat(lowercaseIds).containsExactly(879L);

    // WBMJEA matches WAA 167214 (RU 34752) directly and child WAA 184113 (RU 36834) via draft mark
    List<Long> crossRuIds = reportingUnitRepository.findReportingUnitIdsByTimberMark("wbmjea")
        .stream()
        .map(Number::longValue)
        .toList();
    assertThat(crossRuIds).containsExactlyInAnyOrder(34752L, 36834L);

    assertThat(reportingUnitRepository.findReportingUnitIdsByTimberMark("NONEXISTENT")).isEmpty();
  }
}
