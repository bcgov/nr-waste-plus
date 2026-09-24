package ca.bc.gov.nrs.hrs.dto.block;

/** Response returned when querying or updating attachment scan status. */
public record AttachmentScanResponse(Long attachmentId, AttachmentScanStatus scanStatus) {

  /**
   * Constructs a scan response converting the string representation of scan status.
   *
   * @param attachmentId the attachment identifier
   * @param scanStatus the string representation of scan status
   */
  public AttachmentScanResponse(Long attachmentId, String scanStatus) {
    this(
        attachmentId,
        scanStatus != null
            ? AttachmentScanStatus.valueOf(scanStatus)
            : AttachmentScanStatus.PENDING);
  }
}

