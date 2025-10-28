package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception representing a downstream failure that should not be retried.
 *
 * <p>
 * The exception message includes the failing status and a diagnostic value.
 * </p>
 */
public class UnretriableException extends ResponseStatusException {

  public UnretriableException(HttpStatusCode status, String value) {
    super(status,String.format("Request failed with status %s: cannot retrieve data with parameter %s", status, value));
  }
}
