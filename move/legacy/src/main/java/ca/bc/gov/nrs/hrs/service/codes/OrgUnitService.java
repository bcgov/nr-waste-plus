package ca.bc.gov.nrs.hrs.service.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.repository.codes.OrgUnitRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * This class contains methods to handle Org Units.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrgUnitService {

  private final OrgUnitRepository orgUnitRepository;

  /**
   * Find all Org Units for the Openings Search.
   *
   * @return List of org units.
   */
  public List<CodeDescriptionDto> findAllOrgUnits() {
    log.info("Getting all org units for the search openings");

    List<CodeDescriptionDto> orgUnits = orgUnitRepository
        .findAll()
        .stream()
        .map(orgUnit -> new CodeDescriptionDto(orgUnit.getOrgUnitCode(), orgUnit.getOrgUnitName()))
        .toList();

    log.info("Found {} org units by codes", orgUnits.size());
    return orgUnits;
  }
}
