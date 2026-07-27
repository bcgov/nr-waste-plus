package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpeciesCompositionTableDataDto(
    List<SpeciesCompositionRow> speciesRows
) implements TableDataDto {
}
