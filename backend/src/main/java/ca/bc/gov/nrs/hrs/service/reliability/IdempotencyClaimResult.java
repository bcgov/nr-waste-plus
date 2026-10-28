package ca.bc.gov.nrs.hrs.service.reliability;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Collections;
import java.util.Map;

/**
 * Result of attempting to claim an idempotency key.
 *
 * @param replay whether this request matched an already-completed record to replay
 * @param responseStatus the HTTP status code to replay, or null if claimed
 * @param responseHeaders the HTTP response headers to replay, or empty if none
 * @param responseSnapshot the response JSON payload to replay, or null
 */
public record IdempotencyClaimResult(
    boolean replay,
    Integer responseStatus,
    Map<String, String> responseHeaders,
    JsonNode responseSnapshot
) {

  /**
   * Creates a result indicating the key was successfully claimed for initial processing.
   *
   * @return a claimed result
   */
  public static IdempotencyClaimResult claimed() {
    return new IdempotencyClaimResult(false, null, Collections.emptyMap(), null);
  }

  /**
   * Creates a result indicating a previously completed response should be replayed verbatim.
   *
   * @param status the completed HTTP response status
   * @param headers the completed HTTP response headers to restore
   * @param snapshot the completed response JSON snapshot (nullable)
   * @return a replay result
   */
  public static IdempotencyClaimResult replay(
      int status, Map<String, String> headers, JsonNode snapshot) {
    return new IdempotencyClaimResult(
        true, status, headers != null ? headers : Collections.emptyMap(), snapshot);
  }

  /**
   * Creates a result indicating a previously completed response should be replayed verbatim.
   *
   * @param status the completed HTTP response status
   * @param snapshot the completed response JSON snapshot (nullable)
   * @return a replay result
   */
  public static IdempotencyClaimResult replay(int status, JsonNode snapshot) {
    return replay(status, Collections.emptyMap(), snapshot);
  }

  /**
   * Checks whether this result represents a response replay.
   *
   * @return true if replaying a completed response
   */
  public boolean isReplay() {
    return replay;
  }
}

