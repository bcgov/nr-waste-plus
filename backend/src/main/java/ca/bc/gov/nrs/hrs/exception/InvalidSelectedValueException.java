package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a requested selected value (for example a client
 * number) is invalid for the caller. Mapped to HTTP 403 (Forbidden).
 */
@ResponseStatus(value = HttpStatus.FORBIDDEN)
public class InvalidSelectedValueException extends ResponseStatusException {

  public InvalidSelectedValueException(String message) {
    super(HttpStatus.FORBIDDEN,message);
  }
}
