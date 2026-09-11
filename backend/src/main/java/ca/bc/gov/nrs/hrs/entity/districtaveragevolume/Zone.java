package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import java.util.List;

/**
 * Represents a zone within interior district average volume table data.
 */
public record Zone(String name, List<DistrictRow> districts) {}
