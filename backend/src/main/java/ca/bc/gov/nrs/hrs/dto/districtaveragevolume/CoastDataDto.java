package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;
import java.util.Map;

/**
 * COASTAL-specific implementation of the polymorphic {@link TableDataDto}.
 *
 * <p>This structure represents a hierarchical layout of coastal sections,
 * each containing multiple district rows with coastal-specific metrics.</p>
 *
 * <p>The {@code formulas} field is reserved for future calculated values or
 * rule definitions and is serialized as an empty object when not populated.</p>
 */
public record CoastDataDto(
    List<CoastSectionDto> sections,
    Map<String, Object> formulas // reserved; serializes as {}
) implements TableDataDto {
}