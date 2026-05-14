package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.service.ReportingUnitService;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing Reporting Unit detail endpoints.
 *
 * <p>Provides HTTP endpoints for retrieving full details of a reporting unit,
 * aggregating data from both the legacy API and the Forest Client API via
 * {@link ReportingUnitService}.
 * </p>
 */
@RestController
@RequestMapping("/api/reporting-units")
@RequiredArgsConstructor
@Slf4j
@Observed
public class ReportingUnitController {

  private final ReportingUnitService reportingUnitService;

  /**
   * Retrieve the full details of a reporting unit by its identifier.
   *
   * <p>Delegates to {@link ReportingUnitService} to fetch and enrich the reporting unit
   * data. Returns a combined view including client information, status, grade, sampling,
   * and district.
   * </p>
   *
   * @param reportingUnitId the unique identifier of the reporting unit to retrieve
   * @return a {@link ReportingUnitDetailsDto} containing the reporting unit's full details
   */
  @GetMapping("/{reportingUnitId}")
  public ReportingUnitDetailsDto getReportingUnitDetails(@PathVariable Long reportingUnitId) {

    log.info("Fetching reporting unit details for RU {}", reportingUnitId);

    return reportingUnitService.getReportingUnitDetails(reportingUnitId);
  }

}
