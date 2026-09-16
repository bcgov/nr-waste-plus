package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an attachment intent cannot be found or does not belong to the expected
 * block. Mapped to HTTP 404 (Not Found).
 */
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class AttachmentNotFoundException extends ResponseStatusException {

  /**
   * Constructs a new AttachmentNotFoundException for the given attachment ID.
   *
   * @param attachmentId the attachment identifier
   */
  public AttachmentNotFoundException(Long attachmentId) {
    super(HttpStatus.NOT_FOUND, "Attachment intent not found: " + attachmentId);
  }

  /**
   * Constructs a new AttachmentNotFoundException when an attachment does not belong to the block.
   *
   * @param attachmentId the attachment identifier
   * @param blockId the block identifier
   */
  public AttachmentNotFoundException(Long attachmentId, Long blockId) {
    super(
        HttpStatus.NOT_FOUND,
        String.format("Attachment %d does not belong to block %d", attachmentId, blockId));
  }

  /**
   * Constructs a new AttachmentNotFoundException with the given detail message.
   *
   * @param message the detail message
   */
  public AttachmentNotFoundException(String message) {
    super(HttpStatus.NOT_FOUND, message);
  }
}

