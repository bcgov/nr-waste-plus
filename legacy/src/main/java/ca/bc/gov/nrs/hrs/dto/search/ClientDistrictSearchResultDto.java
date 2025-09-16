package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.time.LocalDateTime;

public record ClientDistrictSearchResultDto(
  CodeDescriptionDto client,
  Long submissionsCount,
  Long blocksCount,
  LocalDateTime lastUpdate
) {
}
