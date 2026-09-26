package ca.bc.gov.nrs.hrs.provider.scanner;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;

/**
 * Provider interface for malware and virus scanning of stored attachment objects.
 *
 * <p>Concrete implementations integrate with the platform-provided scanning solution
 * (e.g., ClamAV, AWS GuardDuty, Trend Micro).
 */
public interface AttachmentScanner {

  /**
   * Submits or evaluates an attachment object for malware.
   *
   * @param attachmentId the attachment primary key
   * @param objectKey the object key in object storage
   * @return the scan verdict ({@link AttachmentScanStatus#CLEAN},
   *     {@link AttachmentScanStatus#QUARANTINED}, {@link AttachmentScanStatus#FAILED},
   *     or {@link AttachmentScanStatus#PENDING} if asynchronous)
   * @throws ScannerUnavailableException if the scanner service is unreachable or unavailable
   */
  AttachmentScanStatus scan(Long attachmentId, String objectKey);
}

