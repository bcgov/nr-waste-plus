package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.service.CodesService;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller that exposes code lists used by the frontend.
 *
 * <p>Endpoints are exposed under {@code /api/codes} and return collections of
 * {@link CodeDescriptionDto} for various code types (districts, sampling, and
 * assessment area statuses). Implementation methods delegate to
 * {@link CodesService} and emit basic access logs.</p>
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
   * <p>Returns a list of {@link CodeDescriptionDto} representing district codes
   * available to the application.</p>
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
   * <p>Returns a list of {@link CodeDescriptionDto} representing sampling
   * categories or types used by the application.</p>
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
   * <p>Returns a list of {@link CodeDescriptionDto} representing possible
   * assessment area statuses.</p>
   *
   * @return list of assessment area status code descriptions
   */
  @GetMapping("/assess-area-statuses")
  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Listing all status codes");
    return service.getStatusCodes();
  }

}
