package ca.bc.gov.nrs.hrs.entity.reportingunit;

import java.math.BigDecimal;

/** Projection for district average volume/stratum rows per waste assessment area. */
public interface DistrictAverageVolumeProjection {

  String getPopulationType();

  String getWasteType();

  String getHarvestMethodCode();

  String getHarvestMethodDescription();

  String getAssessmentMethod();

  String getWasteLevel();

  BigDecimal getNetWasteAreaHa();

  BigDecimal getTotalEstimatedVolumeM3();
}
