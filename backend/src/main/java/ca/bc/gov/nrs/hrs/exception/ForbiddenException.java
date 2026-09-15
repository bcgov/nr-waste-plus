package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an authenticated caller is not authorized to access a requested resource.
 * Mapped to HTTP 403 (Forbidden).
 */
@ResponseStatus(value = HttpStatus.FORBIDDEN)
public class ForbiddenException extends ResponseStatusException {

  /**
   * Constructs a new ForbiddenException with the given detail message.
   *
   * @param message the detail message
   */
  public ForbiddenException(String message) {
    super(HttpStatus.FORBIDDEN, message);
  }
}

