package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an attachment payload or stored object exceeds the configured maximum
 * allowed size. Mapped to HTTP 413 (Content Too Large).
 */
@ResponseStatus(value = HttpStatus.CONTENT_TOO_LARGE)
public class AttachmentSizeExceededException extends ResponseStatusException {

  /**
   * Constructs a new AttachmentSizeExceededException with the declared size and maximum size.
   *
   * @param declaredSize the declared size in bytes
   * @param maxSize the maximum allowed size in bytes
   */
  public AttachmentSizeExceededException(long declaredSize, long maxSize) {
    super(
        HttpStatus.CONTENT_TOO_LARGE,
        String.format(
            "Declared size %d bytes exceeds the maximum allowed size of %d bytes",
            declaredSize, maxSize));
  }

  /**
   * Constructs a new AttachmentSizeExceededException with the given detail message.
   *
   * @param message the detail message
   */
  public AttachmentSizeExceededException(String message) {
    super(HttpStatus.CONTENT_TOO_LARGE, message);
  }

  /**
   * Creates an AttachmentSizeExceededException for a stored object exceeding the maximum allowed
   * size.
   *
   * @param storedSize the stored object size in bytes
   * @param maxSize the maximum allowed size in bytes
   * @return a new AttachmentSizeExceededException
   */
  public static AttachmentSizeExceededException forStoredSize(long storedSize, long maxSize) {
    return new AttachmentSizeExceededException(
        String.format(
            "Stored object size %d bytes exceeds the maximum allowed size of %d bytes",
            storedSize, maxSize));
  }
}

