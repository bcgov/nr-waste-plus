package ca.bc.gov.nrs.hrs.entity.reportingunit;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Projection interface for fetching block-list fields for a Reporting Unit from a native query.
 *
 * <p>Instances are created by Spring Data JPA from the result of
 * {@code ReportingUnitRepository#getReportingUnitBlocks} and carry only the subset of columns
 * required to build a {@link ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitBlockDto}.</p>
 */
public interface ReportingUnitBlockProjection {

  /**
   * Returns the waste assessment area identifier of the block.
   *
   * @return the block identifier
   */
  Long getId();

  /**
   * Returns the forest file (licence) number of the block.
   *
   * @return the licence number string
   */
  String getLicenseNumber();

  /**
   * Returns the cutting permit identifier of the block.
   *
   * @return the cutting permit string, or {@code null} when absent
   */
  String getCuttingPermit();

  /**
   * Returns the cut block identifier of the block.
   *
   * @return the cut block identifier string, or {@code null} when absent
   */
  String getCutBlockId();

  /**
   * Returns the timber mark of the block.
   *
   * @return the timber mark string, or {@code null} when absent
   */
  String getTimberMark();

  /**
   * Returns the total net waste area of the block in hectares.
   *
   * @return the total waste area (ha)
   */
  BigDecimal getTotalWasteAreaHa();

  /**
   * Returns the sum of the stratum estimated volumes of the block in cubic metres.
   *
   * @return the total waste volume (m3), or {@code null} when no stratum volumes exist
   */
  BigDecimal getTotalWasteVolumeM3();

  /**
   * Returns the submitter (sponsor) name recorded against the block.
   *
   * @return the submitter name string, or {@code null} when absent
   */
  String getSubmitter();

  /**
   * Returns the waste assessment area status code of the block.
   *
   * @return the status code string, or {@code null} when the code table has no match
   */
  String getStatusCode();

  /**
   * Returns the human-readable description of the block status.
   *
   * @return the status description, or {@code null} when the code table has no match
   */
  String getStatusName();

  /**
   * Returns the timestamp of the last update to the block row.
   *
   * @return the last updated timestamp
   */
  LocalDateTime getLastUpdated();
}
