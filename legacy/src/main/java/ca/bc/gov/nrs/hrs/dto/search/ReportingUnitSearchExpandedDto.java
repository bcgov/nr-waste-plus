package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * DTO representing an expanded view of a reporting unit search result.
 *
 * <p>This record contains detailed information about a reporting unit including license details,
 * cutting permit information, timber marking, exemption status, and related metadata. It is used
 * to provide comprehensive search results with all relevant reporting unit attributes.</p>
 */
public record ReportingUnitSearchExpandedDto(
    /* The unique identifier of the reporting unit. */
    Long id,
    /* The license number associated with the reporting unit. */
    String licenseNo,
    /* The cutting permit identifier. */
    String cuttingPermit,
    /* The timber mark identifier. */
    String timberMark,
    /* Flag indicating whether the reporting unit is exempted. */
    Boolean exempted,
    /* Flag indicating whether the reporting unit has multiple marks. */
    Boolean multiMark,
    /* The net area of the reporting unit. */
    Double netArea,
    /* The user or entity that submitted the reporting unit. */
    String submitter,
    /* The attachment code and description associated with the reporting unit. */
    CodeDescriptionDto attachment,
    /* Additional comments or notes about the reporting unit. */
    String comments,
    /* The total number of blocks associated with this reporting unit. */
    Integer totalBlocks
) {

}
