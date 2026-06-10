package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.util.List;
import java.util.Map;

public record CoastDataDto(
    List<CoastSectionDto> sections,
    Map<String, Object>   formulas   // reserved; serializes as {}
) implements TableDataDto {}
