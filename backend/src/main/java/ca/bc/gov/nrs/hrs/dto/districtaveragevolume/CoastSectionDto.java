package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;

public record CoastSectionDto(
    String name, // "Mature" | "Immature"
    List<CoastDistrictRowDto> districts) {
}
