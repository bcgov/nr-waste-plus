package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an invalid attachment document type is provided. Mapped to HTTP 400 (Bad
 * Request).
 */
@ResponseStatus(value = HttpStatus.BAD_REQUEST)
public class InvalidDocumentTypeException extends ResponseStatusException {

  /**
   * Constructs a new InvalidDocumentTypeException for the invalid document type.
   *
   * @param documentType the invalid document type string
   */
  public InvalidDocumentTypeException(String documentType) {
    super(HttpStatus.BAD_REQUEST, "Invalid documentType: " + documentType);
  }
}

