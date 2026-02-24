package ca.bc.gov.nrs.hrs.entity.search;

import java.time.LocalDateTime;

/**
 * Projection for client district aggregation queries used by the search service.
 *
 * <p>Exposes only the minimal columns required to present client-level counts and last-update
 * information.</p>
 */
public interface ClientDistrictSearchProjection {

  /**
   * Client (licensee) number.
   */
  String getClientNumber();

  /**
   * Number of submissions for the given client.
   */
  Long getSubmissionsCount();

  /**
   * Number of blocks for the given client.
   */
  Long getBlocksCount();

  /**
   * Last update timestamp for the client's data.
   */
  LocalDateTime getLastUpdate();
}