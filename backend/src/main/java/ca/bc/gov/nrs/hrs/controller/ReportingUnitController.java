package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
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
 *
 * <p>All endpoints in this controller are gated behind
 * {@link FeatureFlag#REPORTING_UNIT_DETAILS_ENABLED}. When the flag is disabled the
 * controller responds with HTTP 404 so the feature remains invisible to callers.</p>
 */
@RestController
@RequestMapping("/api/reporting-units")
@RequiredArgsConstructor
@Slf4j
@Observed
public class ReportingUnitController {

  private final ReportingUnitService reportingUnitService;
  private final FeatureFlagsConfiguration featureFlagsConfiguration;

  /**
   * Retrieve the full details of a reporting unit by its identifier.
   *
   * <p>Delegates to {@link ReportingUnitService} to fetch and enrich the reporting unit
   * data. Returns a combined view including client information, status, grade, sampling,
   * and district.
   * </p>
   *
   * <p>Returns HTTP 404 when {@link FeatureFlag#REPORTING_UNIT_DETAILS_ENABLED} is
   * disabled.</p>
   *
   * @param reportingUnitId the unique identifier of the reporting unit to retrieve
   * @return a {@link ReportingUnitDetailsDto} containing the reporting unit's full details
   * @throws NotFoundGenericException when the feature flag is disabled
   */
  @GetMapping("/{reportingUnitId}")
  public ReportingUnitDetailsDto getReportingUnitDetails(@PathVariable Long reportingUnitId) {

    if (!featureFlagsConfiguration.isEnabled(FeatureFlag.REPORTING_UNIT_DETAILS_ENABLED)) {
      throw new NotFoundGenericException("reporting-unit-details");
    }

    log.info("Fetching reporting unit details for RU {}", reportingUnitId);

    return reportingUnitService.getReportingUnitDetails(reportingUnitId);
  }

}
