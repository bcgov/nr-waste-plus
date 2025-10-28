package ca.bc.gov.nrs.hrs.dto.base;

import lombok.With;

/**
 * Data Transfer Object pairing a code with a name.
 * <p>
 * A compact immutable record used to transport a code and its display name
 * across service and controller boundaries.
 * </p>
 *
 * @param code the code value
 * @param name the display name for the code
 */
@With
public record CodeNameDto(
    String code,
    String name
) {

}
