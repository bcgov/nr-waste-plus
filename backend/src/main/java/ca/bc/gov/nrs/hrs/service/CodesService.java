package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.CodeNameDto;
import ca.bc.gov.nrs.hrs.provider.LegacyApiProvider;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CodesService {

  private final LegacyApiProvider legacyApiProvider;

  public List<CodeNameDto> getDistrictCodes() {
    return legacyApiProvider.getDistrictCodes();
  }

}
