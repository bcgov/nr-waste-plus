package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Generic exception indicating a requested resource was not found.
 * <p>
 * Annotated with {@link ResponseStatus} so when thrown from a controller it
 * translates to an HTTP 404 (Not Found) response with a descriptive message.
 * </p>
 */
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class NotFoundGenericException extends ResponseStatusException {

  /**
   * Constructs a new NotFoundGenericException for the supplied entity name.
   *
   * @param entityName the name of the entity that was not found
   */
  public NotFoundGenericException(String entityName) {
    super(HttpStatus.NOT_FOUND, String.format("%s record(s) not found!", entityName));
  }

  /**
   * Constructs a new NotFoundGenericException for a specific entity instance.
   *
   * @param entityName the entity name
   * @param value the identifier value that was not found
   */
  public NotFoundGenericException(String entityName, String value) {
    super(HttpStatus.NOT_FOUND, String.format("%s record(s) with id %s not found!", entityName, value));
  }
}
