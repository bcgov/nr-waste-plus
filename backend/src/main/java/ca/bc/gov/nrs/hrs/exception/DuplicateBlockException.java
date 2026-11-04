package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when creating a block conflicts with an existing block constraint (for example,
 * attempting to create a second District Average block for a reporting unit). Mapped to HTTP 409
 * (Conflict).
 */
@ResponseStatus(value = HttpStatus.CONFLICT)
public class DuplicateBlockException extends ResponseStatusException {

  private static final String DEFAULT_MESSAGE =
      "A District Average block already exists for this Reporting Unit";

  /** Constructs a new DuplicateBlockException with the default message. */
  public DuplicateBlockException() {
    super(HttpStatus.CONFLICT, DEFAULT_MESSAGE);
  }

  /**
   * Constructs a new DuplicateBlockException with the given detail message.
   *
   * @param message the detail message
   */
  public DuplicateBlockException(String message) {
    super(HttpStatus.CONFLICT, message);
  }
}
