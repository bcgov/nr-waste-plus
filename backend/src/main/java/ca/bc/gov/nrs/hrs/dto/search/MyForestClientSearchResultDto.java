package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.With;

@Builder
@With
public record MyForestClientSearchResultDto(
    CodeDescriptionDto client,
    Long submissionsCount,
    Long blocksCount,
    LocalDateTime lastUpdate
) {
}
