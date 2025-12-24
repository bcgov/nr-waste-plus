package ca.bc.gov.nrs.hrs.entity.search;

/**
 * Projection interface representing an expanded view of a reporting unit
 * for search results.
 *
 * <p>This interface is typically used by Spring Data JPA to map query
 * results directly to an interface-based projection.</p>
 */
public interface ReportingUnitSearchExpandedProjection {

  /**
   * Gets the unique identifier of the reporting unit.
   *
   * @return the unique identifier of the reporting unit
   */
  Long getId();

  /**
   * Gets the license number associated with the reporting unit.
   *
   * @return the license number associated with the reporting unit
   */
  String getLicenseNo();

  /**
   * Gets the cutting permit identifier.
   *
   * @return the cutting permit identifier
   */
  String getCuttingPermit();

  /**
   * Gets the timber mark for the reporting unit.
   *
   * @return the timber mark for the reporting unit
   */
  String getTimberMark();

  /**
   * Gets the exemption status of the reporting unit.
   *
   * @return {@code 1} if the reporting unit is exempted, {@code 0} otherwise
   */
  Integer getExempted();

  /**
   * Gets the multiple marks indicator for the reporting unit.
   *
   * @return {@code 1} if the reporting unit has multiple timber marks, {@code 0} otherwise
   */
  Integer getMultiMark();

  /**
   * Gets the net area of the reporting unit.
   *
   * @return the net area of the reporting unit
   */
  Double getNetArea();

  /**
   * Gets the name or identifier of the entity that submitted the reporting unit.
   *
   * @return the name or identifier of the submitter
   */
  String getSubmitter();

  /**
   * Gets the identifier of the associated attachment.
   *
   * @return the identifier of the associated attachment, if any
   */
  Long getAttachmentId();

  /**
   * Gets the name or description of the associated attachment.
   *
   * @return the name of the associated attachment, if any
   */
  String getAttachmentName();

  /**
   * Gets any comments or additional notes associated with the reporting unit.
   *
   * @return any comments associated with the reporting unit
   */
  String getComments();

  /**
   * Gets the total number of blocks associated with the reporting unit.
   *
   * @return the total number of blocks in the reporting unit
   */
  Integer getTotalBlockCount();
}