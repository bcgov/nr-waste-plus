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
   * @return the unique identifier of the reporting unit
   */
  Long getId();

  /**
   * @return the license number associated with the reporting unit
   */
  String getLicenseNo();

  /**
   * @return the cutting permit identifier
   */
  String getCuttingPermit();

  /**
   * @return the timber mark for the reporting unit
   */
  String getTimberMark();

  /**
   * @return {@code true} if the reporting unit is exempted, otherwise {@code false}
   */
  Integer getExempted();

  /**
   * @return {@code true} if the reporting unit has multiple timber marks, otherwise {@code false}
   */
  Integer getMultiMark();

  /**
   * @return the net area of the reporting unit
   */
  Double getNetArea();

  /**
   * @return the name or identifier of the submitter
   */
  String getSubmitter();

  /**
   * @return the identifier of the associated attachment, if any
   */
  Long getAttachmentId();

  /**
   * @return the name of the associated attachment, if any
   */
  String getAttachmentName();

  /**
   * @return any comments associated with the reporting unit
   */
  String getComments();

  /**
   * @return the total number of blocks in the reporting unit
   */
  Integer getTotalBlockCount();
}