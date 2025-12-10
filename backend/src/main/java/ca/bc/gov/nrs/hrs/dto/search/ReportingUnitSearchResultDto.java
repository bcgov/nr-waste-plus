package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.time.LocalDateTime;
import lombok.With;

/**
 * DTO representing a reporting unit search result returned by the search
 * endpoints.
 *
 * <p>
 * This immutable record contains summary information about a reporting unit
 * that is useful for search result listings: identifiers, human-readable
 * code/description pairs for related entities, status and last update time.
 * </p>
 *
 * @param id the unique identifier of the reporting unit
 * @param blockId the block identifier
 * @param ruNumber the numeric reporting unit number
 * @param client the client represented as a {@link CodeDescriptionDto}
 * @param sampling the sampling type represented as a {@link CodeDescriptionDto}
 * @param district the district represented as a {@link CodeDescriptionDto}
 * @param status the reporting unit status represented as a {@link CodeDescriptionDto}
 * @param lastUpdated the timestamp of the last update for this reporting unit
 */
@With
public record ReportingUnitSearchResultDto(
    String id,
    String blockId,
    Long ruNumber,
    String licenseNumber,
    String cuttingPermit,
    String timberMark,
    boolean multiMark,
    CodeDescriptionDto client,
    CodeDescriptionDto sampling,
    CodeDescriptionDto district,
    CodeDescriptionDto status,
    LocalDateTime lastUpdated
) {
}
