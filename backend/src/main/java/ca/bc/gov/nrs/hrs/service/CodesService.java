package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.provider.LegacyApiProvider;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class CodesService {

  private final LegacyApiProvider legacyApiProvider;

  public List<CodeDescriptionDto> getDistrictCodes() {
    log.info("Fetching district codes from legacy API");
    return legacyApiProvider.getDistrictCodes();
  }

  public List<CodeDescriptionDto> getSamplingCodes() {
    log.info("Fetching sampling options from legacy API");
    return legacyApiProvider.getSamplingCodes();
  }

  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Fetching assess area statuses from legacy API");
    return legacyApiProvider.getStatusCodes();
  }
}
