package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

@ResponseStatus(value = HttpStatus.FORBIDDEN)
public class InvalidSelectedValueException extends ResponseStatusException {

  public InvalidSelectedValueException(String message) {
    super(HttpStatus.FORBIDDEN,message);
  }
}
