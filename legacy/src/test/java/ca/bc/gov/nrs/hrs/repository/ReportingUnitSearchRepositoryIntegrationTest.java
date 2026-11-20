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
}
