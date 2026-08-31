package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/** Indicates that a required strong conditional request validator is invalid. */
@ResponseStatus(HttpStatus.PRECONDITION_FAILED)
public class ConditionalRequestException extends ResponseStatusException {

  /** Creates a precondition failure for a missing, malformed, or stale validator. */
  public ConditionalRequestException() {
    super(HttpStatus.PRECONDITION_FAILED,
        "The If-Match header is required and must match the current resource revision.");
  }
}
