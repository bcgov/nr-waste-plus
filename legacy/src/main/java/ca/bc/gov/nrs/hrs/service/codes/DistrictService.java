package ca.bc.gov.nrs.hrs.service.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.mappers.codes.DistrictMapper;
import ca.bc.gov.nrs.hrs.repository.codes.OrgUnitRepository;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * This class contains methods to handle Districts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class DistrictService {

  private final OrgUnitRepository orgUnitRepository;
  private final DistrictMapper districtMapper;

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
        .map(districtMapper::fromProjection)
        .toList();

    log.info("Found {} org units by codes", orgUnits.size());
    return orgUnits;
  }
}
