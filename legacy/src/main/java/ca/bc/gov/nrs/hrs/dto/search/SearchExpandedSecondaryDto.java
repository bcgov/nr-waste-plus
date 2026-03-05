package ca.bc.gov.nrs.hrs.dto.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;

/**
 * DTO representing a secondary mark entry used in expanded reporting unit search results.
 *
 * <p>This record encapsulates information about a secondary timber mark associated with a
 * reporting unit, including the mark string, its status (as a code + description), and the area
 * attributed to that secondary mark.</p>
 *
 * <p>Components:</p>
 * <ul>
 *   <li>mark - Secondary timber mark string.</li>
 *   <li>status - The status of the secondary mark (code + description).</li>
 *   <li>area - Area value associated with the secondary mark.</li>
 * </ul>
 *
 * @param mark Secondary timber mark string.
 * @param status The status of the secondary mark (code + description).
 * @param area Area value associated with the secondary mark.
 */
public record SearchExpandedSecondaryDto(
    String mark,
    CodeDescriptionDto status,
    Double area
) {

}
