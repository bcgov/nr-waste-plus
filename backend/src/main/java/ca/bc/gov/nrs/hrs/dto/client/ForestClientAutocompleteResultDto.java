package ca.bc.gov.nrs.hrs.dto.client;

import lombok.With;

/**
 * The type Forest client autocomplete result dto.
 */
@With
public record ForestClientAutocompleteResultDto(
    String id,
    String name,
    String acronym
) {

}
