package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import java.util.List;

public record Zone(String name, List<DistrictRow> districts) {
}
