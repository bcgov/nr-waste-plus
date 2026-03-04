package ca.bc.gov.nrs.hrs.entity.search;

/**
 * Projection interface representing a secondary mark entry used in expanded
 * reporting unit search results.
 *
 * <p>This interface is typically used by Spring Data JPA to map query
 * results directly to an interface-based projection. It provides a compact
 * view of a secondary timber mark including its code, display name, and
 * associated area.</p>
 *
 * <p>Components:</p>
 * <ul>
 *   <li>mark - Secondary timber mark string.</li>
 *   <li>statusCode - Status code for the secondary mark.</li>
 *   <li>statusName - Human-readable status display name.</li>
 *   <li>area - Area value associated with the secondary mark.</li>
 * </ul>
 */
public interface SearchExpandedSecondaryProjection {

  /**
   * Gets the secondary timber mark string.
   *
   * @return the secondary timber mark
   */
  String getMark();

  /**
   * Gets the status code for the secondary mark.
   *
   * @return the status code of the secondary mark
   */
  String getStatusCode();

  /**
   * Gets the human-readable status name for the secondary mark.
   *
   * @return the human-readable status name
   */
  String getStatusName();

  /**
   * Gets the area associated with the secondary mark.
   *
   * @return the area value associated with the secondary mark, or {@code null} if not available
   */
  Double getArea();
}
