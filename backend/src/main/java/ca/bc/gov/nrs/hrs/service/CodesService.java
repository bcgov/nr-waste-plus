package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.provider.LegacyApiProvider;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service that exposes various code lists retrieved from the legacy API.
 *
 * <p>Acts as a thin adapter over {@link LegacyApiProvider} and provides
 * methods to fetch district, sampling and status code lists used by the UI.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class CodesService {

  private final LegacyApiProvider legacyApiProvider;

  /**
   * Retrieve district codes from the legacy API.
   *
   * @return list of district {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getDistrictCodes() {
    log.info("Fetching district codes from legacy API");
    return legacyApiProvider.getDistrictCodes();
  }

  /**
   * Retrieve sampling options from the legacy API.
   *
   * @return list of sampling {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getSamplingCodes() {
    log.info("Fetching sampling options from legacy API");
    return legacyApiProvider.getSamplingCodes();
  }

  /**
   * Retrieve assess area status codes from the legacy API.
   *
   * @return list of status {@link CodeDescriptionDto}
   */
  @NewSpan
  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Fetching assess area statuses from legacy API");
    return legacyApiProvider.getStatusCodes();
  }
}
