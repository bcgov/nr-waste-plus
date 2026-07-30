package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import ca.bc.gov.nrs.hrs.entity.speciescomposition.SpeciesCompositionRow;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * Species composition implementation of the polymorphic {@link TableDataDto}.
 *
 * <p>Unlike INTERIOR/COASTAL which split data by zone or section, species composition
 * is a flat matrix of species percentages by district. The {@code rows} list contains
 * one entry per district (plus a Provincial Weighted Avg row).</p>
 *
 * @param rows flat list of species composition rows
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpeciesCompositionTableDataDto(
    List<SpeciesCompositionRow> rows
) implements TableDataDto {
}
