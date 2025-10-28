package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.With;

/**
 * DTO used to return summary information for a client's "My Forest" search
 * results.
 * <p>
 * Contains the client (code/description), counts of submissions and blocks,
 * and the timestamp of the last update related to the client.
 * </p>
 *
 * @param client the client represented as a {@link CodeDescriptionDto}
 * @param submissionsCount number of submissions associated with the client
 * @param blocksCount number of blocks associated with the client
 * @param lastUpdate timestamp of the last update for this client's data
 */
@Builder
@With
public record MyForestClientSearchResultDto(
    CodeDescriptionDto client,
    Long submissionsCount,
    Long blocksCount,
    LocalDateTime lastUpdate
) {
}
