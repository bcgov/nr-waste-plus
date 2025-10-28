package ca.bc.gov.nrs.hrs.dto.base;

import lombok.With;

/**
 * Data Transfer Object that pairs a code with its human-readable description.
 *
 * <p>Represents a small immutable record used throughout the application to
 * return or transport a code and its corresponding description.
 * </p>
 *
 * <p>(Maintains the original brief description: "The type Code description dto.")
 * </p>
 *
 * @param code        the code value
 * @param description the human-readable description for the code
 */
@With
public record CodeDescriptionDto(
    String code,
    String description
) {

}
