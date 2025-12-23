package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class BlockNotFound extends ResponseStatusException {

  public BlockNotFound(Long ruId, Long blockId) {
    super(
        HttpStatus.NOT_FOUND,
        "Block with ID " + blockId + " not found for Reporting Unit with ID " + ruId + "."
    );
  }
}
