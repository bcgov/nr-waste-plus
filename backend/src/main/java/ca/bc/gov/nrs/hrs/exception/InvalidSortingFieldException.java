package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a requested sort field is not part of the sorting allowlist. Mapped to
 * HTTP 428 (Precondition Required), mirroring the legacy search behavior for invalid sort fields
 * (issue #1238: the PostgreSQL reporting-unit search rejects unknown sort keys with the same
 * convention).
 */
@ResponseStatus(value = HttpStatus.PRECONDITION_REQUIRED)
public class InvalidSortingFieldException extends ResponseStatusException {

  /**
   * Constructs a new InvalidSortingFieldException with the standard detail message.
   *
   * @param field the requested (invalid) sort field name
   */
  public InvalidSortingFieldException(String field) {
    super(
        HttpStatus.PRECONDITION_REQUIRED,
        "Field "
            + field
            + " is not a valid sorting field. Please check the documentation for valid sorting"
            + " fields.");
  }
}
