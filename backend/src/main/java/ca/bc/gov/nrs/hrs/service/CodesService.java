package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service that exposes various code lists retrieved from the legacy API.
 *
 * <p>Acts as a thin adapter over {@link LegacyApiProvider} and provides methods to fetch
 * district, sampling, and status code lists used by the UI. Enriches district codes with
 * geographic area information from {@link DistrictVolumeService}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class CodesService {

  private final LegacyApiProvider legacyApiProvider;
  private final DistrictVolumeService districtVolumeService;

  /**
   * Retrieves district codes from the legacy API, enriched with geographic area information.
   *
   * <p>For each district code, fetches the list of configured geographic areas (INTERIOR,
   * COASTAL) from the district volume service and attaches them to the response.</p>
   *
   * @return list of district {@link CodeDescriptionDto} with areas populated
   */
  @NewSpan
  public List<CodeDescriptionDto> getDistrictCodes() {
    log.info("Fetching district codes from legacy API");
    var districtCodes = legacyApiProvider.getDistrictCodes();
    var areasMap = districtVolumeService.getAreasForMultipleDistricts(
        districtCodes.stream().map(CodeDescriptionDto::code).toList());
    return districtCodes.stream()
        .map(dto -> dto.withAreas(areasMap.getOrDefault(dto.code(), List.of())))
        .toList();
  }

  /**
   * Retrieves sampling options from the legacy API.
   *
   * @return list of sampling {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getSamplingCodes() {
    log.info("Fetching sampling options from legacy API");
    return legacyApiProvider.getSamplingCodes();
  }

  /**
   * Retrieves assess area status codes from the legacy API.
   *
   * @return list of status {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Fetching assess area statuses from legacy API");
    return legacyApiProvider.getStatusCodes();
  }
}
