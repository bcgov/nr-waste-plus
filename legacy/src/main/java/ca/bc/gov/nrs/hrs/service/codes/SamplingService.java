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

/**
 * Service exposing sampling option codes used in the waste assessment domain.
 *
 * <p>Wraps repository access to the sampling option code table and maps entities to
 * {@link CodeDescriptionDto} using {@link SamplingOptionMapper}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class SamplingService {

  private final SamplingOptionRepository repository;
  private final SamplingOptionMapper codeMapping;

  /**
   * Retrieve all valid sampling options.
   *
   * <p>Loads active sampling options and maps each entity to a DTO for UI consumption.</p>
   *
   * @return list of sampling option {@link CodeDescriptionDto}
   */
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
