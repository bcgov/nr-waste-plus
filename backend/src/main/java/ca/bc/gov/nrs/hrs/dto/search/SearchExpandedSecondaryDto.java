package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * DTO representing secondary expanded search details for a reporting unit.
 *
 * @param mark the timber mark
 * @param status the status represented as a {@link CodeDescriptionDto}
 * @param area the area value
 */
public record SearchExpandedSecondaryDto(
    String mark,
    CodeDescriptionDto status,
    Double area
) {

}
