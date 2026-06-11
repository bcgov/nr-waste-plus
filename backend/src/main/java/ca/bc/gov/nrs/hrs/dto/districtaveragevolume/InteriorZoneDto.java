package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;

/**
 * Represents a zone within an INTERIOR dataset.
 *
 * <p>A zone groups multiple district rows under a common interior
 * classification, such as "Dry belt", "Transition zone", or "Wet belt".
 *
 * <p>Each zone contains a list of {@link InteriorDistrictRowDto} entries
 * that hold the detailed volume values for individual districts.
 */
public record InteriorZoneDto(
    String name, // "Dry belt" | "Transition zone" | "Wet belt"
    List<InteriorDistrictRowDto> districts
) {}