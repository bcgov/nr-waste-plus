package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;
import java.util.Map;

public record InteriorDataDto(
    List<InteriorZoneDto> zones,
    Map<String, Object>   formulas   // reserved; serializes as {}
) implements TableDataDto {}
