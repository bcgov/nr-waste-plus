package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception indicating a failed downstream request with a specific HTTP
 * status code and diagnostic value.
 *
 * <p>
 * The exception message is formatted to include the status and the
 * parameter/value that caused the failure.
 * </p>
 */
public class RequestException extends ResponseStatusException {

  public RequestException(HttpStatusCode status, String value) {
    super(status,String.format("Request failed with status %s: cannot retrieve data with parameter %s", status, value));
  }
}
