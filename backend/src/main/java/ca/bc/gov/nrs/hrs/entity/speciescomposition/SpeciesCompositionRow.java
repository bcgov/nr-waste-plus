package ca.bc.gov.nrs.hrs.entity.speciescomposition;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.util.Map;

/**
 * A single district row in the species composition matrix.
 *
 * <p>The {@code species} map holds abbreviated species codes (e.g. {@code "BA"},
 * {@code "CE"}) as keys and their percentage values as values. The set of valid
 * keys is defined by the spreadsheet and must match the frontend's
 * {@code EXPECTED_SPECIES_HEADERS} constant.
 *
 * @param district the district this row represents
 * @param species  map of species code → percentage value
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpeciesCompositionRow(
    CodeDescriptionDto district,
    Map<String, BigDecimal> species
) {}