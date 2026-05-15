package ca.bc.gov.nrs.hrs.entity.reportingunit;


/**
 * Projection interface for fetching Reporting Unit detail fields from a native query.
 *
 * <p>Instances are created by Spring Data JPA from the result of
 * {@code ReportingUnitRepository#getReportingUnitDetails} and carry only the subset of columns
 * required to build a {@link ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto}.</p>
 */
public interface ReportingUnitDetailsProjection {

  /**
   * Returns the client number that owns this reporting unit.
   *
   * @return the client number string
   */
  String getClientNumber();

  /**
   * Returns the client location code for this reporting unit.
   *
   * @return the client location code string
   */
  String getClientLocnCode();

  /**
   * Returns the sampling option code for this reporting unit.
   *
   * @return the sampling code string
   */
  String getSamplingCode();

  /**
   * Returns the human-readable name of the sampling option.
   *
   * @return the sampling name string
   */
  String getSamplingName();

  /**
   * Returns the district code (org unit code) for this reporting unit.
   *
   * @return the district code string
   */
  String getDistrictCode();

  /**
   * Returns the full district name for this reporting unit.
   *
   * @return the district name string
   */
  String getDistrictName();
}
