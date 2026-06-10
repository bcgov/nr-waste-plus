package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;

/**
 * Represents a section within a COASTAL dataset.
 *
 * <p>A section groups multiple district rows under a common category,
 * such as "Mature" or "Immature", representing different coastal classifications.</p>
 *
 * <p>Each section contains a list of {@link CoastDistrictRowDto} entries
 * that hold the detailed numeric breakdown per district.</p>
 */
public record CoastSectionDto(
    String name, // "Mature" | "Immature"
    List<CoastDistrictRowDto> districts
) {}
