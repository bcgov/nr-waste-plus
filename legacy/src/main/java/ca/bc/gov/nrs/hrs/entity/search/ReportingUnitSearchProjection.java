package ca.bc.gov.nrs.hrs.entity.search;

import java.time.LocalDateTime;

/**
 * Projection interface for reporting-unit search queries.
 *
 * <p>Used by Spring Data to fetch only the required columns for search results rather than full
 * entity instances. Each accessor corresponds to a column or derived field in the query.</p>
 */
public interface ReportingUnitSearchProjection {

  /**
   * Reporting unit block identifier.
   */
  String getBlockId();

  /**
   * Reporting unit number.
   */
  Long getRuNumber();

  /**
   * Client (licensee) number.
   */
  String getClientNumber();

  /**
   * License number AKA Forest File ID.
   */
  String getLicenseNumber();

  /**
   * Cutting permit ID.
   */
  String getCuttingPermit();

  /**
   * Timber mark.
   */
  String getTimberMark();

  /**
   * Is multi-mark or not
   */
  Boolean isMultiMark();

  /**
   * Sampling option code.
   */
  String getSamplingCode();

  /**
   * Sampling option display name.
   */
  String getSamplingName();

  /**
   * District code.
   */
  String getDistrictCode();

  /**
   * District display name.
   */
  String getDistrictName();

  /**
   * Status code for the reporting unit.
   */
  String getStatusCode();

  /**
   * Status display name.
   */
  String getStatusName();

  /**
   * Timestamp of last update for the reporting unit.
   */
  LocalDateTime getLastUpdated();
}