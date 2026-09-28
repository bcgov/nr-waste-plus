package ca.bc.gov.nrs.hrs.dto.block;

/**
 * Malware scan status for block attachments.
 *
 * <p>State machine transitions: {@code PENDING -> CLEAN | QUARANTINED | FAILED}.
 */
public enum AttachmentScanStatus {
  PENDING,
  CLEAN,
  QUARANTINED,
  FAILED;

  /**
   * Checks whether a transition from this scan status to the given target status is valid.
   *
   * @param target the desired next scan status
   * @return true if the transition is allowed or idempotent, false otherwise
   */
  public boolean canTransitionTo(AttachmentScanStatus target) {
    if (this == target) {
      return true;
    }
    return this == PENDING;
  }

  /**
   * Safely resolves an attachment scan status from a database column value,
   * defaulting to {@link #PENDING} if null, blank, or unrecognized.
   *
   * @param value the raw database string value
   * @return the resolved {@link AttachmentScanStatus}, never null
   */
  public static AttachmentScanStatus fromDb(String value) {
    if (value == null || value.isBlank()) {
      return PENDING;
    }
    try {
      return AttachmentScanStatus.valueOf(value.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      return PENDING;
    }
  }
}

