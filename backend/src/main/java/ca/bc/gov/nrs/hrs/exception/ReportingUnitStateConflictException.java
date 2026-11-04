package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when the expected reporting unit state does not match the actual reporting unit
 * state. Mapped to HTTP 409 (Conflict).
 */
@ResponseStatus(value = HttpStatus.CONFLICT)
public class ReportingUnitStateConflictException extends ResponseStatusException {

  /**
   * Constructs a new ReportingUnitStateConflictException comparing the expected and actual states.
   *
   * @param expectedState the state expected by the caller
   * @param actualState the actual state of the reporting unit
   */
  public ReportingUnitStateConflictException(String expectedState, String actualState) {
    super(
        HttpStatus.CONFLICT,
        String.format(
            "Reporting unit state conflict: expected '%s' but was '%s'",
            expectedState, actualState));
  }

  /**
   * Constructs a new ReportingUnitStateConflictException with the given detail message.
   *
   * @param message the detail message
   */
  public ReportingUnitStateConflictException(String message) {
    super(HttpStatus.CONFLICT, message);
  }
}

