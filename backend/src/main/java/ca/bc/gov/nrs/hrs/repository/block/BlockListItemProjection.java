package ca.bc.gov.nrs.hrs.repository.block;

import java.math.BigDecimal;
import java.time.Instant;

/** Scalar fields selected for a reporting-unit block-list row. */
public interface BlockListItemProjection {

  Long getId();

  String getLicenseNumber();

  String getCuttingPermit();

  String getCutBlockId();

  String getTimberMark();

  BigDecimal getTotalWasteAreaHa();

  String getSubmitter();

  String getRawStatus();

  Instant getUpdatedAt();

  String getBlockType();
}
