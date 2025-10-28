package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a client requests sorting by a field that is not supported.
 *
 * <p>Maps to HTTP 428 Precondition Required via {@link ResponseStatus @ResponseStatus}. The
 * exception message returned to clients includes the invalid field name and a short guidance to
 * consult the API documentation for valid sorting fields.</p>
 *
 * @since 1.0.0
 */
@ResponseStatus(HttpStatus.PRECONDITION_REQUIRED)
public class InvalidSortingFieldException extends ResponseStatusException {

  /**
   * Create an exception describing the invalid sorting field.
   *
   * @param message the invalid field name supplied by the client
   */
  public InvalidSortingFieldException(String message) {
    super(
        HttpStatus.PRECONDITION_REQUIRED,
        "Field " + message
        + " is not a valid sorting field. Please check the documentation for valid sorting fields."
    );
  }
}
