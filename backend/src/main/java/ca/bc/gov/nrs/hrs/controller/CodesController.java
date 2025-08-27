package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.base.CodeNameDto;
import ca.bc.gov.nrs.hrs.service.CodesService;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/codes")
@AllArgsConstructor
@Observed
public class CodesController {

  private final CodesService service;

  @GetMapping("/districts")
  public List<CodeNameDto> getDistrictCodes() {
    return service.getDistrictCodes();
  }

}
