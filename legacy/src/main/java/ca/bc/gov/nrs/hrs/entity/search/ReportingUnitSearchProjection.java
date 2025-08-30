package ca.bc.gov.nrs.hrs.entity.search;

import java.time.LocalDateTime;

public interface ReportingUnitSearchProjection {
  String getBlockId();
  Long getRuNumber();
  String getClientNumber();
  String getClientLocation();
  String getSamplingCode();
  String getSamplingName();
  String getDistrictCode();
  String getDistrictName();
  String getStatusCode();
  String getStatusName();
  LocalDateTime getLastUpdated();
}
