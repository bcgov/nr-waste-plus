package ca.bc.gov.nrs.hrs.dto.client;

import lombok.With;

/**
 * DTO used to represent a forest client in autocomplete or lightweight
 * search responses.
 *
 * <p>
 * Contains an identifier, display name and optional acronym suited for
 * compact UI elements such as autocomplete dropdowns.
 * </p>
 */
@With
public record ForestClientAutocompleteResultDto(
    String id,
    String name,
    String acronym
) {

}
