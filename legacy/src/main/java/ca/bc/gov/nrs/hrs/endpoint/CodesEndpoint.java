package ca.bc.gov.nrs.hrs.endpoint;

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
 * The Codes endpoint. Returns all the codes used by the frontend.
 */
@RestController
@RequestMapping("/api/codes")
@RequiredArgsConstructor
public class CodesEndpoint {

  private final DistrictService districtService;
  private final SamplingService samplingService;
  private final AssessAreaStatusService assessAreaStatusService;

  @GetMapping("/districts")
  public List<CodeDescriptionDto> getDistricts() {
    return districtService.findAllOrgUnits();
  }

  @GetMapping("/samplings")
  public List<CodeDescriptionDto> getSamplingCodes() {
    return samplingService.getSamplingCodes();
  }

  @GetMapping("/assess-area-statuses")
  public List<CodeDescriptionDto> getStatusCodes() {
    return assessAreaStatusService.getStatusCodes();
  }
}
