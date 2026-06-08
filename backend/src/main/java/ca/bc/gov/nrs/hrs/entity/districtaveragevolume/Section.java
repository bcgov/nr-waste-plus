package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import java.util.List;

public record Section(String name, List<DistrictRow> districts) {
}
