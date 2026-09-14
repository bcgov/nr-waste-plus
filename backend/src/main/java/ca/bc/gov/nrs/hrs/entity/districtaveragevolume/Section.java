package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import java.util.List;

/**
 * Represents a section within coastal district average volume table data.
 */
public record Section(String name, List<DistrictRow> districts) {}
