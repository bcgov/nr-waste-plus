package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.service.codes.AssessAreaStatusService;
import ca.bc.gov.nrs.hrs.service.codes.DistrictService;
import ca.bc.gov.nrs.hrs.service.codes.SamplingService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller that exposes application code lists used by the frontend.
 *
 * <p>This controller returns small, read-only code sets such as districts, sampling codes and
 * assessment-area statuses. These endpoints are intended for populating dropdowns and other
 * UI widgets.</p>
 *
 * Existing single-line comment retained: "The Codes endpoint. Returns all the codes used by the frontend.".
 */
@RestController
@RequestMapping("/api/codes")
@RequiredArgsConstructor
public class CodesController {

  private final DistrictService districtService;
  private final SamplingService samplingService;
  private final AssessAreaStatusService assessAreaStatusService;

  /**
   * Return the list of district code/description pairs.
   *
   * @return a list of {@link CodeDescriptionDto} representing districts
   */
  @GetMapping("/districts")
  public List<CodeDescriptionDto> getDistricts() {
    return districtService.findAllOrgUnits();
  }

  /**
   * Return the list of sampling codes used by the frontend.
   *
   * @return a list of {@link CodeDescriptionDto} representing sampling codes
   */
  @GetMapping("/samplings")
  public List<CodeDescriptionDto> getSamplingCodes() {
    return samplingService.getSamplingCodes();
  }

  /**
   * Return the list of assessment-area status codes.
   *
   * @return a list of {@link CodeDescriptionDto} representing assess-area statuses
   */
  @GetMapping("/assess-area-statuses")
  public List<CodeDescriptionDto> getStatusCodes() {
    return assessAreaStatusService.getStatusCodes();
  }
}
