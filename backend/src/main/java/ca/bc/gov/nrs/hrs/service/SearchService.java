package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.provider.LegacyApiProvider;
import io.micrometer.observation.annotation.Observed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class SearchService {

  private final LegacyApiProvider legacyApiProvider;

  public Page<ReportingUnitSearchResultDto> search(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable
  ) {
    return legacyApiProvider
        .searchReportingUnit(filters, pageable);
  }
}
