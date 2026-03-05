package ca.bc.gov.nrs.hrs.entity.search;

/**
 * Projection interface representing an expanded view of a reporting unit
 * for search results.
 *
 * <p>This interface is typically used by Spring Data JPA to map query
 * results directly to an interface-based projection. It exposes a flattened
 * set of properties that are useful when rendering comprehensive search
 * results for reporting units.</p>
 *
 * <p>Components:</p>
 * <ul>
 *   <li>id - Unique identifier for the reporting unit.</li>
 *   <li>licenseNo - License number associated with the reporting unit.</li>
 *   <li>cuttingPermit - Cutting permit identifier.</li>
 *   <li>timberMark - Primary timber mark for the reporting unit.</li>
 *   <li>exempted - Exemption indicator (1 = exempted, 0 = not exempted).</li>
 *   <li>multiMark - Multiple marks indicator (1 = multiple marks, 0 = single).</li>
 *   <li>netArea - Net area of the reporting unit.</li>
 *   <li>markArea - Area attributed specifically to the mark.</li>
 *   <li>submitter - Name or identifier of the entity that submitted the reporting unit.</li>
 *   <li>attachmentId - Identifier of an associated attachment, if present.</li>
 *   <li>attachmentName - Display name or description of the associated attachment.</li>
 *   <li>comments - Any additional comments or notes associated with the reporting unit.</li>
 *   <li>totalBlockCount - Total number of blocks associated with the reporting unit.</li>
 *   <li>totalChildCount - Total number of child units or related records.</li>
 *   <li>secondary - Aggregated secondary timber marks (comma-separated string).</li>
 *   <li>statusCode - Status code for the reporting unit.</li>
 *   <li>statusName - Human-readable status display name.</li>
 * </ul>
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
   * @return the cutting permit identifier, or {@code null} if not applicable
   */
  String getCuttingPermit();

  /**
   * Gets the timber mark for the reporting unit.
   *
   * @return the primary timber mark for the reporting unit
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
   * @return the net area of the reporting unit, or {@code null} if not available
   */
  Double getNetArea();

  /**
   * Gets the area attributed to the mark within the reporting unit.
   *
   * @return the area attributed to the mark, or {@code null} if not available
   */
  Double getMarkArea();

  /**
   * Gets the name or identifier of the entity that submitted the reporting unit.
   *
   * @return the name or identifier of the submitter
   */
  String getSubmitter();

  /**
   * Gets the identifier of the associated attachment.
   *
   * @return the identifier of the associated attachment, or {@code null} if none
   */
  Long getAttachmentId();

  /**
   * Gets the name or description of the associated attachment.
   *
   * @return the name of the associated attachment, or {@code null} if none
   */
  String getAttachmentName();

  /**
   * Gets any comments or additional notes associated with the reporting unit.
   *
   * @return any comments associated with the reporting unit, or {@code null} if none
   */
  String getComments();

  /**
   * Gets the total number of blocks associated with the reporting unit.
   *
   * @return the total number of blocks in the reporting unit
   */
  Integer getTotalBlockCount();

  /**
   * Gets the total number of child units or related records for the reporting unit.
   *
   * @return the total number of child units or related records
   */
  Integer getTotalChildCount();

  /**
   * Gets the aggregated timber marks of any secondary blocks associated with the current block.
   *
   * @return a comma-separated string of secondary timber marks, or {@code null} if none
   */
  String getSecondary();

  /**
   * Status code for the reporting unit.
   *
   * @return the status code
   */
  String getStatusCode();

  /**
   * Status display name.
   *
   * @return the human-readable status display name
   */
  String getStatusName();
}