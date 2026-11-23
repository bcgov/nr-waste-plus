package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an illegal or unauthorized lifecycle state transition is requested.
 * Mapped to HTTP 409 (Conflict).
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IllegalTransitionException extends ResponseStatusException {

  /**
   * Constructs an IllegalTransitionException with the given detail reason.
   *
   * @param message failure explanation
   */
  public IllegalTransitionException(String message) {
    this(message, "ILLEGAL_TRANSITION", null, false);
  }

  /**
   * Constructs an IllegalTransitionException with error code and state details.
   *
   * @param message failure explanation
   * @param code stable error code
   * @param blockState current block lifecycle state
   * @param retryable whether the operation is retryable
   */
  public IllegalTransitionException(
      String message, String code, String blockState, boolean retryable) {
    super(HttpStatus.CONFLICT, message);
    getBody().setProperty("code", code);
    if (blockState != null) {
      getBody().setProperty("blockState", blockState);
    }
    getBody().setProperty("retryable", retryable);
  }
}
