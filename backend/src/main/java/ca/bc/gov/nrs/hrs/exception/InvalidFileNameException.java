package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an attachment file name is invalid (e.g. blank or contains no usable
 * characters). Mapped to HTTP 400 (Bad Request).
 */
@ResponseStatus(value = HttpStatus.BAD_REQUEST)
public class InvalidFileNameException extends ResponseStatusException {

  /**
   * Constructs a new InvalidFileNameException with the given detail message.
   *
   * @param message the detail message
   */
  public InvalidFileNameException(String message) {
    super(HttpStatus.BAD_REQUEST, message);
  }
}

