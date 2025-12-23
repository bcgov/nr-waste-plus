package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

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
    Integer totalBlocks
) {

}
