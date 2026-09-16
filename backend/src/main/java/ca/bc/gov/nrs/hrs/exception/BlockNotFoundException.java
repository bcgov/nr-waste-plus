package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when a block cannot be found for a reporting unit. Mapped to HTTP 404 (Not
 * Found).
 */
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class BlockNotFoundException extends ResponseStatusException {

  /**
   * Constructs a new BlockNotFoundException for the given block ID and reporting unit ID.
   *
   * @param blockId the block identifier
   * @param reportingUnitId the reporting unit identifier
   */
  public BlockNotFoundException(Long blockId, Long reportingUnitId) {
    super(
        HttpStatus.NOT_FOUND,
        String.format("Block %d not found for reporting unit %d", blockId, reportingUnitId));
  }

  /**
   * Constructs a new BlockNotFoundException with the given detail message.
   *
   * @param message the detail message
   */
  public BlockNotFoundException(String message) {
    super(HttpStatus.NOT_FOUND, message);
  }
}

