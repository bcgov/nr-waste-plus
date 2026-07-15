package ca.bc.gov.nrs.hrs.dto.speciescomposition;

import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Payload for species composition data.
 *
 * <p>Unlike {@code TableDataDto}, species composition has no interior/coastal
 * split — it is a single flat matrix of species percentages by district — so
 * this is a plain record rather than a sealed interior/coastal hierarchy.
 *
 * @param rows one row per district (plus the Provincial Weighted Avg row)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpeciesCompositionDataDto(List<SpeciesCompositionRow> rows) {}