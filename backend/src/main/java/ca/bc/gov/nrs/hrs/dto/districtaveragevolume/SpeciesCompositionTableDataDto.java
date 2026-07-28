package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Species composition implementation of the polymorphic {@link TableDataDto}.
 *
 * <p>This structure represents a flat matrix of species percentages by
 * district, without the interior/coastal split used in district volume
 * data.</p>
 *
 * @param speciesRows one row per district
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpeciesCompositionTableDataDto(
    List<SpeciesCompositionRow> speciesRows
) implements TableDataDto {
}
