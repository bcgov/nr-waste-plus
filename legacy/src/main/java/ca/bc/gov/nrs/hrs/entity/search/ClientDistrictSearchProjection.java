package ca.bc.gov.nrs.hrs.entity.search;

import java.time.LocalDateTime;

public interface ClientDistrictSearchProjection {
  String getClientNumber();
  Long getSubmissionsCount();
  Long getBlocksCount();
  LocalDateTime getLastUpdate();
}
