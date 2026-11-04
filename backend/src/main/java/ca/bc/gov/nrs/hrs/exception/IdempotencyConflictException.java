package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an idempotency key conflict occurs:
 * either a key is reused with a different request payload/fingerprint,
 * or a concurrent request with the same key is currently in progress.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IdempotencyConflictException extends ResponseStatusException {

  /**
   * Constructs an IdempotencyConflictException with a specific reason.
   *
   * @param reason the detail explanation for the conflict
   */
  public IdempotencyConflictException(String reason) {
    super(HttpStatus.CONFLICT, reason);
  }

  /**
   * Creates a conflict exception when the supplied key was already used with a different payload.
   *
   * @param key the idempotency key
   * @return the configured IdempotencyConflictException
   */
  public static IdempotencyConflictException mismatchedFingerprint(String key) {
    return new IdempotencyConflictException(
        "Idempotency key '" + key + "' has already been used with a different request payload.");
  }

  /**
   * Creates a conflict exception when another request with the same key is currently in progress.
   *
   * @param key the idempotency key
   * @return the configured IdempotencyConflictException
   */
  public static IdempotencyConflictException inProgress(String key) {
    return new IdempotencyConflictException(
        "A request with idempotency key '" + key + "' is currently in progress.");
  }
}

