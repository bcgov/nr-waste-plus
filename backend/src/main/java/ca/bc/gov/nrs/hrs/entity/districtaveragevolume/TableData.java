package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TableData(
    List<Zone> zones,                     // INTERIOR only
    List<Section> sections,               // COASTAL only
    List<SpeciesCompositionRow> speciesRows,
    Map<String, Object> formulas          // reserved for future use; store as {}
) {
}
