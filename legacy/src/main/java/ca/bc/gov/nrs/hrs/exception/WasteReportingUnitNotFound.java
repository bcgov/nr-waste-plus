package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a Reporting Unit cannot be found for the given identifier.
 *
 * <p>Produces an HTTP 404 Not Found response when thrown from a controller method.
 * The exception message includes the requested reporting-unit ID to aid debugging.</p>
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class WasteReportingUnitNotFound extends ResponseStatusException {

  /**
   * Constructs a new exception indicating the reporting unit with the given ID was not found.
   *
   * @param ruId the identifier of the reporting unit that could not be located
   */
  public WasteReportingUnitNotFound(Long ruId) {
    super(HttpStatus.NOT_FOUND, "Reporting Unit with ID " + ruId + " not found.");
  }

}
