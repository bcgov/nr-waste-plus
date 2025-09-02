package ca.bc.gov.nrs.hrs.service.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.mappers.codes.AssessAreaStatusMapper;
import ca.bc.gov.nrs.hrs.repository.codes.AssessAreaStatusRepository;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class AssessAreaStatusService {

  private final AssessAreaStatusRepository repository;
  private final AssessAreaStatusMapper codeMapping;

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
