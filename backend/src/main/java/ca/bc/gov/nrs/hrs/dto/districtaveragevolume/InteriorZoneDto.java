package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;

public record InteriorZoneDto(
    String                    name,        // "Dry belt" | "Transition zone" | "Wet belt"
    List<InteriorDistrictRowDto> districts
) {}