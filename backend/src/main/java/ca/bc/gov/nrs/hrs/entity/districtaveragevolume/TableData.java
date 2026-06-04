package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TableData(List<Zone> zones, // INTERIOR only
    List<Section> sections,               // COASTAL only
    Map<String, Object> formulas          // reserved for future use; store as {}
) {
}
