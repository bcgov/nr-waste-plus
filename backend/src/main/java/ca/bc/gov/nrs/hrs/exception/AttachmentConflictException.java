package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception thrown when an attachment operation conflicts with the current resource state (for
 * example, missing uploaded object, size mismatch, or checksum mismatch). Mapped to HTTP 409
 * (Conflict).
 */
@ResponseStatus(value = HttpStatus.CONFLICT)
public class AttachmentConflictException extends ResponseStatusException {

  /**
   * Constructs a new AttachmentConflictException with the given detail message.
   *
   * @param message the detail message
   */
  public AttachmentConflictException(String message) {
    super(HttpStatus.CONFLICT, message);
  }

  /**
   * Creates an AttachmentConflictException when the uploaded object is missing from object storage.
   *
   * @param attachmentId the attachment identifier
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException missingObject(Long attachmentId) {
    return new AttachmentConflictException(
        "Uploaded object missing for attachment " + attachmentId);
  }

  /**
   * Creates an AttachmentConflictException when the actual stored size does not match declared
   * size.
   *
   * @param expectedBytes the declared or expected size in bytes
   * @param actualBytes the actual size observed in object storage
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException sizeMismatch(Long expectedBytes, long actualBytes) {
    return new AttachmentConflictException(
        String.format(
            "Size mismatch: expected %d bytes, actual %d bytes", expectedBytes, actualBytes));
  }

  /**
   * Creates an AttachmentConflictException when the checksum has drifted from the initial finalize.
   *
   * @param expectedChecksum the previously recorded checksum
   * @param actualChecksum the newly observed checksum
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException checksumMismatch(
      String expectedChecksum, String actualChecksum) {
    return new AttachmentConflictException(
        String.format(
            "Checksum mismatch: expected %s, actual %s", expectedChecksum, actualChecksum));
  }

  /**
   * Creates an AttachmentConflictException when attempting an illegal scan status transition.
   *
   * @param current the current scan status
   * @param target the requested scan status
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException invalidScanStatusTransition(
      Object current, Object target) {
    return new AttachmentConflictException(
        String.format(
            "Invalid scan status transition: cannot transition from %s to %s", current, target));
  }

  /**
   * Creates an AttachmentConflictException when attempting to scan an attachment that has
   * not been finalized.
   *
   * @param attachmentId the attachment identifier
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException attachmentNotFinalized(Long attachmentId) {
    return new AttachmentConflictException(
        String.format("Attachment %d cannot be scanned because it is not finalized", attachmentId));
  }

  /**
   * Creates an AttachmentConflictException when attempting to access a quarantined attachment.
   *
   * @param attachmentId the attachment identifier
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException quarantined(Long attachmentId) {
    return new AttachmentConflictException(
        String.format("Attachment %d has been quarantined due to malware", attachmentId));
  }

  /**
   * Creates an AttachmentConflictException when attempting to access an attachment
   * whose malware scan is still pending.
   *
   * @param attachmentId the attachment identifier
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException scanPending(Long attachmentId) {
    return new AttachmentConflictException(
        String.format("Attachment %d scan is currently pending", attachmentId));
  }

  /**
   * Creates an AttachmentConflictException when attempting to access an attachment
   * whose malware scan failed.
   *
   * @param attachmentId the attachment identifier
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException scanFailed(Long attachmentId) {
    return new AttachmentConflictException(
        String.format("Attachment %d malware scan failed", attachmentId));
  }

  /**
   * Creates an AttachmentConflictException when the uploaded staging object was modified
   * concurrently during finalization.
   *
   * @param attachmentId the attachment identifier
   * @return a new AttachmentConflictException
   */
  public static AttachmentConflictException sourceModified(Long attachmentId) {
    return new AttachmentConflictException(
        String.format(
            "Uploaded object for attachment %d was modified during finalization", attachmentId));
  }
}

