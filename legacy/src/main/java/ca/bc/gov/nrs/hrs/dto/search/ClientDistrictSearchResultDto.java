package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.time.LocalDateTime;

/**
 * DTO representing a client district search result used by the "my-forest-clients" endpoint.
 *
 * <p>Contains a client description, counts of submissions and blocks and the last update time.</p>
 */
public record ClientDistrictSearchResultDto(
    CodeDescriptionDto client,
    Long submissionsCount,
    Long blocksCount,
    LocalDateTime lastUpdate
) {

}
