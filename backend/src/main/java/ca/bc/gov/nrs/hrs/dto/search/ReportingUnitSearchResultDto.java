package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.time.LocalDateTime;
import lombok.With;

@With
public record ReportingUnitSearchResultDto(
    String id,
    String blockId,
    Long ruNumber,
    CodeDescriptionDto client,
    CodeDescriptionDto clientLocation,
    CodeDescriptionDto sampling,
    CodeDescriptionDto district,
    CodeDescriptionDto status,
    LocalDateTime lastUpdated
) {
}
