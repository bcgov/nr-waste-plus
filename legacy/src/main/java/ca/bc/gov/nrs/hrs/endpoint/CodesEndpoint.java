package ca.bc.gov.nrs.hrs.endpoint;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.service.codes.OrgUnitService;
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

  private final OrgUnitService orgUnitService;

  /**
   * Get the Org units list for the openings search API.
   *
   * @return List of OrgUnitEntity with found org units.
   */
  @GetMapping("/districts")
  public List<CodeDescriptionDto> getOpeningOrgUnits() {
    return orgUnitService.findAllOrgUnits();
  }
}
