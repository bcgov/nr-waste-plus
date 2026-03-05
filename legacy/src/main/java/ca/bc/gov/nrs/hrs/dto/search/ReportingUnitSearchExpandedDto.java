package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import java.util.List;

/**
 * DTO representing an expanded view of a reporting unit search result.
 *
 * <p>This record contains detailed information about a reporting unit including license details,
 * cutting permit information, timber marking, exemption status, and related metadata. It is used
 * to provide comprehensive search results with all relevant reporting unit attributes.</p>
 *
 * <p>Components:</p>
 * <ul>
 *   <li>id - Unique identifier for the reporting unit.</li>
 *   <li>licenseNo - The license number associated with the reporting unit.</li>
 *   <li>cuttingPermit - Cutting permit identifier, if applicable.</li>
 *   <li>timberMark - The timber mark associated with the unit.</li>
 *   <li>exempted - Whether the reporting unit is exempted from certain rules.</li>
 *   <li>multiMark - Whether the unit uses multiple marks.</li>
 *   <li>status - The current status of the reporting unit (code + description).</li>
 *   <li>secondaryMarks - A list of secondary marks related to this reporting unit.</li>
 *   <li>netArea - Net area (in appropriate units) of the reporting unit.</li>
 *   <li>markArea - Area attributed to the mark within the reporting unit.</li>
 *   <li>submitter - The user or system that submitted the reporting unit.</li>
 *   <li>attachment - Attachment metadata (code + description) associated with the unit.</li>
 *   <li>comments - Any additional comments or notes for the reporting unit.</li>
 *   <li>totalBlocks - Total number of blocks associated with the reporting unit.</li>
 *   <li>totalChildren - Total number of child units or related records.</li>
 * </ul>
 *
 * @param id Unique identifier for the reporting unit.
 * @param licenseNo The license number associated with the reporting unit.
 * @param cuttingPermit Cutting permit identifier, if applicable.
 * @param timberMark The timber mark associated with the unit.
 * @param exempted Whether the reporting unit is exempted from certain rules.
 * @param multiMark Whether the unit uses multiple marks.
 * @param status The current status of the reporting unit (code + description).
 * @param secondaryMarks A list of secondary marks related to this reporting unit.
 * @param netArea Net area (in appropriate units) of the reporting unit.
 * @param markArea Area attributed to the mark within the reporting unit.
 * @param submitter The user or system that submitted the reporting unit.
 * @param attachment Attachment metadata (code + description) associated with the unit.
 * @param comments Any additional comments or notes for the reporting unit.
 * @param totalBlocks Total number of blocks associated with the reporting unit.
 * @param totalChildren Total number of child units or related records.
 */
public record ReportingUnitSearchExpandedDto(
    Long id,
    String licenseNo,
    String cuttingPermit,
    String timberMark,
    Boolean exempted,
    Boolean multiMark,
    CodeDescriptionDto status,
    List<SearchExpandedSecondaryDto> secondaryMarks,
    Double netArea,
    Double markArea,
    String submitter,
    CodeDescriptionDto attachment,
    String comments,
    Long totalBlocks,
    Long totalChildren
) {

}
