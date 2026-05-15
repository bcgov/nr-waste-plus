package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProvider;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service responsible for retrieving and enriching Reporting Unit details.
 *
 * <p>Fetches raw data from the legacy API and enriches it with client information
 * from the Forest Client API, combining both into a unified
 * {@link ReportingUnitDetailsDto} response.
 * </p>
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class ReportingUnitService {

  private final LegacyApiProvider legacyApiProvider;
  private final ForestClientApiProvider forestClientApiProvider;

  /**
   * Retrieve and enrich the full details of a reporting unit.
   *
   * <p>Fetches the reporting unit's legacy data (client number, sampling, district)
   * from the legacy API and then enriches it with client name and status from the
   * Forest Client API.
   * </p>
   *
   * <!-- TODO(grade-configuration): The {@code grade} field has been intentionally omitted
   *      from {@link ReportingUnitDetailsDto} until the grade-configuration feature branch
   *      adds a data source for it.  When that work lands, restore the grade parameter here
   *      (see the matching TODO in ReportingUnitDetailsDto).
   * -->
   *
   * @param reportingUnitId the unique identifier of the reporting unit to retrieve
   * @return a fully populated {@link ReportingUnitDetailsDto} combining legacy and
   *         Forest Client API data; never null
   * @throws ForestClientNotFoundException if no Forest Client record can be found for
   *         the client number returned by the legacy API
   */
  public ReportingUnitDetailsDto getReportingUnitDetails(Long reportingUnitId) {
    log.info("Fetching reporting unit details for RU {}", reportingUnitId);
    var legacyClient = legacyApiProvider.getReportingUnitDetails(reportingUnitId);
    var clientInformation = forestClientApiProvider.fetchClientByNumber(legacyClient.clientNumber())
        .orElseThrow(() -> new ForestClientNotFoundException(legacyClient.clientNumber()));

    return new ReportingUnitDetailsDto(
        reportingUnitId,
        new CodeDescriptionDto(
            clientInformation.clientNumber(),
            clientInformation.name()
        ),
        new CodeDescriptionDto(
            clientInformation.clientStatusCode().getCode(),
            clientInformation.clientStatusCode().getDescription()
        ),
        legacyClient.sampling(),
        legacyClient.district()
    );
  }

}
