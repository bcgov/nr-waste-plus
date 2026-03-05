package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

public record SearchExpandedSecondaryDto(
    String mark,
    CodeDescriptionDto status,
    Double area
) {

}
