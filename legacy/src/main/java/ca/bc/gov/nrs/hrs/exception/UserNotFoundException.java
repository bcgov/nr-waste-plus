package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an expected user cannot be found.
 *
 * <p>This exception maps to HTTP 404 Not Found via {@link ResponseStatus @ResponseStatus} and
 * extends {@link ResponseStatusException} so it may be thrown directly from controllers or
 * service layer code to indicate the user is not registered.</p>
 */
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class UserNotFoundException extends ResponseStatusException {

  /**
   * Create a {@code UserNotFoundException} with a default message.
   *
   * @since 1.0.0
   */
  public UserNotFoundException() {
    super(HttpStatus.NOT_FOUND, "User not registered!");
  }
}
