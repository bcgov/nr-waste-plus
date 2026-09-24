package ca.bc.gov.nrs.hrs.provider.scanner;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * Default fallback implementation of {@link AttachmentScanner} used when no concrete platform
 * scanner is configured.
 *
 * <p>Always throws {@link ScannerUnavailableException} to ensure the application fails closed:
 * attachments remain {@link AttachmentScanStatus#PENDING} and are never treated as clean
 * by default.
 */
@Component
@ConditionalOnMissingBean(AttachmentScanner.class)
@Slf4j
public class DefaultAttachmentScanner implements AttachmentScanner {

  @Override
  public AttachmentScanStatus scan(Long attachmentId, String objectKey) {
    log.warn(
        "No concrete malware scanner configured; failing closed for attachment id={}, objectKey={}",
        attachmentId,
        objectKey);
    throw new ScannerUnavailableException(
        "Platform malware scanner product is not configured or unavailable");
  }
}

