package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a block is not found for a given reporting unit.
 *
 * <p>This exception is thrown when attempting to retrieve or access a block that does not exist
 * within a specific reporting unit. It returns an HTTP 404 Not Found status to the client.</p>
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class BlockNotFound extends ResponseStatusException {

  /**
   * Constructs a new BlockNotFound exception with the given reporting unit and block IDs.
   *
   * <p>The exception message will include both the block ID and the reporting unit ID for
   * better debugging and error reporting.</p>
   *
   * @param ruId    the ID of the reporting unit
   * @param blockId the ID of the block that was not found
   */
  public BlockNotFound(Long ruId, Long blockId) {
    super(
        HttpStatus.NOT_FOUND,
        "Block with ID " + blockId + " not found for Reporting Unit with ID " + ruId + "."
    );
  }
}
