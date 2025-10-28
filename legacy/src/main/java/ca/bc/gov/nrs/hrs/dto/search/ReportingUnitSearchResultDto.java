package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.time.LocalDateTime;
import lombok.With;

/**
 * Result DTO for a reporting-unit search entry.
 *
 * <p>Represents a single reporting-unit search result shown in search result pages. Fields
 * include identifying information and the last update timestamp.</p>
 *
 */
@With
public record ReportingUnitSearchResultDto(
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
