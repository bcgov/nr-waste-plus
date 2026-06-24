package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a waste assessment area is not found for a given reporting unit.
 *
 * <p>This exception is thrown when attempting to retrieve or access a waste assessment area that
 * does not exist within a specific reporting unit. It returns an HTTP 404 Not Found status to the
 * client.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class WasteAssessmentAreaNotFound extends ResponseStatusException {

  /**
   * Constructs a new exception with the given reporting unit and waste assessment area IDs.
   *
   * <p>The exception message includes both the waste assessment area ID and the reporting unit ID
   * for better debugging and error reporting.
   *
   * @param ruId the ID of the reporting unit
   * @param wasteAssessmentAreaId the ID of the waste assessment area that was not found
   */
  public WasteAssessmentAreaNotFound(Long ruId, Long wasteAssessmentAreaId) {
    super(
        HttpStatus.NOT_FOUND,
        "Waste assessment area with ID "
            + wasteAssessmentAreaId
            + " not found for Reporting Unit with ID "
            + ruId
            + "."
    );
  }
}