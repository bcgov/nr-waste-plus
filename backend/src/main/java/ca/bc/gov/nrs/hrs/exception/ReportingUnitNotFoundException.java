package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a reporting unit cannot be found. Mapped to HTTP 404 (Not Found).
 */
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class ReportingUnitNotFoundException extends ResponseStatusException {

  /**
   * Constructs a new ReportingUnitNotFoundException for the given reporting unit ID.
   *
   * @param reportingUnitId the reporting unit identifier
   */
  public ReportingUnitNotFoundException(Long reportingUnitId) {
    super(HttpStatus.NOT_FOUND, String.format("Reporting unit %d not found", reportingUnitId));
  }

  /**
   * Constructs a new ReportingUnitNotFoundException with the given detail message.
   *
   * @param message the detail message
   */
  public ReportingUnitNotFoundException(String message) {
    super(HttpStatus.NOT_FOUND, message);
  }
}

