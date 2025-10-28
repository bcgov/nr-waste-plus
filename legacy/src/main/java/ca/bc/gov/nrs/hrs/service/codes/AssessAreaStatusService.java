package ca.bc.gov.nrs.hrs.service.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.mappers.codes.AssessAreaStatusMapper;
import ca.bc.gov.nrs.hrs.repository.codes.AssessAreaStatusRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service that exposes assessment-area status codes for use by the search UI and API.
 *
 * <p>Wraps repository access and maps entities to {@link CodeDescriptionDto} instances using
 * {@link AssessAreaStatusMapper}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class AssessAreaStatusService {

  private final AssessAreaStatusRepository repository;
  private final AssessAreaStatusMapper codeMapping;

  /**
   * Retrieve all valid assessment-area status codes.
   *
   * <p>This method loads active rows from the code table via the repository, maps each
   * entity to a {@link CodeDescriptionDto} and returns the resulting list.</p>
   *
   * @return list of status {@link CodeDescriptionDto} suitable for UI selection lists
   */
  @NewSpan
  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Getting all assessment area status for the search openings");

    List<CodeDescriptionDto> codes = repository
        .findAllValid()
        .stream()
        .map(codeMapping::toDto)
        .toList();

    log.info("Found {} all assessment area status by codes", codes.size());
    return codes;
  }
}
