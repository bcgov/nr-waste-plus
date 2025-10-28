package ca.bc.gov.nrs.hrs.service.codes;

import ca.bc.gov.nrs.hrs.configuration.HrsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.mappers.codes.DistrictMapper;
import ca.bc.gov.nrs.hrs.repository.codes.OrgUnitRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

/**
 * Service for retrieving district (organization unit) code lists used by the search UI.
 *
 * <p>Loads configured districts from {@link HrsConfiguration} and maps database projections
 * to {@link CodeDescriptionDto} objects via {@link DistrictMapper}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class DistrictService {

  private final OrgUnitRepository orgUnitRepository;
  private final DistrictMapper districtMapper;
  private final HrsConfiguration configuration;

  /**
   * Find all Org Units for the Openings Search.
   *
   * <p>Fetches configured org-unit codes and maps them to DTOs. The description text is cleaned
   * to remove the phrase "Natural Resource District" for compact display.</p>
   *
   * @return List of {@link CodeDescriptionDto} representing org units
   */
  @NewSpan
  public List<CodeDescriptionDto> findAllOrgUnits() {
    log.info("Getting all org units for the search openings");

    List<CodeDescriptionDto> orgUnits = orgUnitRepository
        .findAllByOrgUnitCodeInOrderByOrgUnitCodeAsc(configuration.getDistricts())
        .stream()
        .map(districtMapper::fromProjection)
        .map(code -> code.withDescription(
                code
                    .description()
                    .replaceAll("Natural Resource District", StringUtils.EMPTY)
                    .trim()
            )
        )
        .toList();

    log.info("Found {} org units by codes", orgUnits.size());
    return orgUnits;
  }
}
