package ca.bc.gov.nrs.hrs.service.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.mappers.codes.SamplingOptionMapper;
import ca.bc.gov.nrs.hrs.repository.codes.SamplingOptionRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class SamplingService {

  private final SamplingOptionRepository repository;
  private final SamplingOptionMapper codeMapping;

  @NewSpan
  public List<CodeDescriptionDto> getSamplingCodes() {
    log.info("Getting all sampling options for the search openings");

    List<CodeDescriptionDto> codes = repository
        .findAllValid()
        .stream()
        .map(codeMapping::toDto)
        .toList();

    log.info("Found {} sampling options by codes", codes.size());
    return codes;
  }
}
