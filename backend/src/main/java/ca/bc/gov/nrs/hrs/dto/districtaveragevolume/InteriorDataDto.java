package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;
import java.util.Map;

/**
 * INTERIOR-specific implementation of the polymorphic {@link TableDataDto}.
 *
 * <p>This structure represents a hierarchical layout of interior zones,
 * each containing multiple district rows with interior-specific metrics.
 *
 * <p>The {@code formulas} field is reserved for future calculated values or
 * rule definitions and is serialized as an empty object when not populated.
 */
public record InteriorDataDto(
    List<InteriorZoneDto> zones,
    Map<String, Object> formulas
) implements TableDataDto {
}