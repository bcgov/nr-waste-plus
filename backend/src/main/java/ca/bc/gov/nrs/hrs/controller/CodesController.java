package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.service.CodesService;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller that exposes code lists used by the frontend.
 *
 * <p>Endpoints are exposed under {@code /api/codes} and return collections of {@link
 * CodeDescriptionDto} for various code types (districts, sampling, assessment area statuses,
 * harvest statuses, and maturity types). Implementation methods delegate to {@link CodesService}
 * and emit basic access logs.
 *
 * @since 1.0.0
 */
@RestController
@RequestMapping("/api/codes")
@AllArgsConstructor
@Observed
@Slf4j
public class CodesController {

  private final CodesService service;

  /**
   * Retrieve district codes.
   *
   * <p>Returns a list of {@link CodeDescriptionDto} representing district codes available to the
   * application.
   *
   * @return list of district code descriptions
   */
  @GetMapping("/districts")
  public List<CodeDescriptionDto> getDistrictCodes() {
    log.info("Listing all districts");
    return service.getDistrictCodes();
  }

  /**
   * Retrieve sampling codes.
   *
   * <p>Returns a list of {@link CodeDescriptionDto} representing sampling categories or types used
   * by the application.
   *
   * @return list of sampling code descriptions
   */
  @GetMapping("/samplings")
  public List<CodeDescriptionDto> getSamplingCodes() {
    log.info("Listing all sampling codes");
    return service.getSamplingCodes();
  }

  /**
   * Retrieve assessment area status codes.
   *
   * <p>Returns a list of {@link CodeDescriptionDto} representing possible assessment area statuses.
   *
   * @return list of assessment area status code descriptions
   */
  @GetMapping("/assess-area-statuses")
  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Listing all status codes");
    return service.getStatusCodes();
  }

  /**
   * Retrieve harvest status codes, optionally scoped to a reporting-unit variant.
   *
   * <p>When {@code reportingUnitId} and/or {@code blockId} are provided, the backend derives the
   * coast/interior variant from database context and applies configured allowlists. When no context
   * is provided or the variant cannot be resolved, all available harvest status codes are returned.
   *
   * @param reportingUnitId optional reporting unit identifier used for variant resolution
   * @param blockId optional block identifier used for variant resolution
   * @return list of harvest status code descriptions
   */
  @GetMapping("/harvest-statuses")
  public List<CodeDescriptionDto> getHarvestStatusCodes(
      @RequestParam(required = false) Long reportingUnitId,
      @RequestParam(required = false) Long blockId) {
    log.info(
        "Listing harvest status codes (reportingUnitId={}, blockId={})", reportingUnitId, blockId);
    return service.getHarvestStatusCodes(reportingUnitId, blockId);
  }

  /**
   * Retrieve waste maturity type codes.
   *
   * <p>Returns a list of {@link CodeDescriptionDto} representing maturity type options. The set is
   * stable and not scoped by coast/interior variant.
   *
   * @return list of maturity type code descriptions
   */
  @GetMapping("/maturity-types")
  public List<CodeDescriptionDto> getMaturityTypeCodes() {
    log.info("Listing maturity type codes");
    return service.getMaturityTypeCodes();
  }

  /**
   * Retrieve district average criteria codes.
   *
   * <p>Returns currently effective district average criteria options (Waste manual section 4.5)
   * ordered by criterion number. Descriptions are returned without a numeric prefix.
   *
   * @return list of district average criteria code descriptions
   */
  @GetMapping("/district-average-criteria")
  public List<CodeDescriptionDto> getDistrictAverageCriteriaCodes() {
    log.info("Listing district average criteria codes");
    return service.getDistrictAverageCriteriaCodes();
  }
}
