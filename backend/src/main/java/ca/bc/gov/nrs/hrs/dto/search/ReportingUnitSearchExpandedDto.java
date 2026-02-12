package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * DTO representing an expanded view of a reporting unit search result.
 *
 * <p>This immutable record contains detailed information about a reporting unit
 * that may be useful for detailed listings or reports.</p>
 *
 * @param id the unique identifier of the reporting unit
 * @param licenseNo the license number associated with the reporting unit
 * @param cuttingPermit the cutting permit associated with the reporting unit
 * @param timberMark the timber mark associated with the reporting unit
 * @param exempted indicates if the reporting unit is exempted
 * @param multiMark indicates if the reporting unit has multiple marks
 * @param netArea the net area of the reporting unit
 * @param submitter the submitter of the reporting unit
 * @param attachment an attachment associated with the reporting unit represented
 *                   as a {@link CodeDescriptionDto}
 * @param comments any comments related to the reporting unit
 * @param totalBlocks the total number of blocks in the reporting unit
 * @param secondaryTimberMarks A comma-separated list of secondary timber marks
 *                             associated with the block, if any.
 * @param primaryMark The primary timber mark associated with the current block,
 *                    if the block is a child block; otherwise, returns null.
 */
public record ReportingUnitSearchExpandedDto(
    Long id,
    String licenseNo,
    String cuttingPermit,
    String timberMark,
    Boolean exempted,
    Boolean multiMark,
    Double netArea,
    String submitter,
    CodeDescriptionDto attachment,
    String comments,
    Integer totalBlocks,
    String secondaryTimberMarks,
    String primaryMark
) {

}

