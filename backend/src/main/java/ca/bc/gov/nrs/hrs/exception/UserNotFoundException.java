package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a user record cannot be found.
 *
 * <p>
 * When thrown from a controller this results in an HTTP 404 (Not Found)
 * response due to the {@link ResponseStatus} annotation.
 * </p>
 */
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class UserNotFoundException extends ResponseStatusException {

  public UserNotFoundException() {
    super(HttpStatus.NOT_FOUND, "User not registered!");
  }
}
