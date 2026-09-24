package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.exception.AttachmentConflictException;
import ca.bc.gov.nrs.hrs.exception.AttachmentNotFoundException;
import ca.bc.gov.nrs.hrs.provider.scanner.AttachmentScanner;
import ca.bc.gov.nrs.hrs.provider.scanner.ScannerUnavailableException;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing malware scanning state transitions and scanner product integration
 * for submission block attachments.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Observed
public class AttachmentScanService {

  private final BlockAttachmentRepository attachmentRepository;
  private final AttachmentScanner scanner;

  /**
   * Triggers or evaluates malware scanning for a finalized attachment.
   *
   * <p>If the scanner is unavailable or unconfigured, the operation fails closed:
   * the attachment's {@code scan_status} remains {@code PENDING} indefinitely.
   *
   * @param attachmentId the attachment identifier
   * @return the resulting scan status ({@code PENDING}, {@code CLEAN},
   *     {@code QUARANTINED}, or {@code FAILED})
   */
  @NewSpan
  @Transactional
  public AttachmentScanStatus scan(Long attachmentId) {
    BlockAttachmentEntity attachment =
        attachmentRepository
            .findByIdAndDeletedFalse(attachmentId)
            .orElseThrow(() -> new AttachmentNotFoundException(attachmentId));

    if (!AttachmentStatus.FINALIZED.name().equals(attachment.getStatus())) {
      throw AttachmentConflictException.attachmentNotFinalized(attachmentId);
    }

    try {
      AttachmentScanStatus verdict = scanner.scan(attachmentId, attachment.getObjectKey());
      if (verdict != null && verdict != AttachmentScanStatus.PENDING) {
        updateScanStatus(attachmentId, verdict);
        return verdict;
      }
      return AttachmentScanStatus.PENDING;
    } catch (ScannerUnavailableException e) {
      log.warn(
          "Malware scanner unavailable for attachment id={}: {}."
              + " Failing closed; scan status remains PENDING.",
          attachmentId,
          e.getMessage());
      return AttachmentScanStatus.PENDING;
    } catch (AttachmentConflictException e) {
      log.warn(
          "Conflict updating scan status for attachment id={}: {}",
          attachmentId,
          e.getMessage());
      throw e;
    } catch (Exception e) {
      log.error(
          "Unexpected error communicating with malware scanner for attachment id={}: {}."
              + " Failing closed; scan status remains PENDING.",
          attachmentId,
          e.getMessage(),
          e);
      return AttachmentScanStatus.PENDING;
    }
  }

  /**
   * Updates an attachment's scan status according to the state machine:
   * {@code PENDING -> CLEAN | QUARANTINED | FAILED}.
   *
   * <p>Transitions from terminal states to different states are rejected with
   * {@link AttachmentConflictException}.
   * Transitions to the identical state are idempotent no-ops.
   *
   * @param attachmentId the attachment identifier
   * @param newStatus the new scan status to apply
   * @return the updated entity
   */
  @NewSpan
  @Transactional
  public BlockAttachmentEntity updateScanStatus(Long attachmentId, AttachmentScanStatus newStatus) {
    return updateScanStatus(attachmentId, null, newStatus);
  }

  /**
   * Updates an attachment's scan status according to the state machine:
   * {@code PENDING -> CLEAN | QUARANTINED | FAILED}, optionally verifying the owning block.
   *
   * <p>Transitions from terminal states to different states are rejected with
   * {@link AttachmentConflictException}.
   * Transitions to the identical state are idempotent no-ops.
   *
   * @param attachmentId the attachment identifier
   * @param expectedBlockId optional owning block identifier to verify
   * @param newStatus the new scan status to apply
   * @return the updated entity
   */
  @NewSpan
  @Transactional
  public BlockAttachmentEntity updateScanStatus(
      Long attachmentId, Long expectedBlockId, AttachmentScanStatus newStatus) {
    BlockAttachmentEntity attachment =
        attachmentRepository
            .findByIdAndDeletedFalseForUpdate(attachmentId)
            .orElseThrow(() -> new AttachmentNotFoundException(attachmentId));

    if (expectedBlockId != null && !attachment.getBlockId().equals(expectedBlockId)) {
      throw new AttachmentNotFoundException(attachmentId, expectedBlockId);
    }

    if (!AttachmentStatus.FINALIZED.name().equals(attachment.getStatus())) {
      throw AttachmentConflictException.attachmentNotFinalized(attachmentId);
    }

    AttachmentScanStatus currentStatus =
        AttachmentScanStatus.fromDb(attachment.getScanStatus());
    if (currentStatus == newStatus) {
      log.debug("Attachment id={} scan status already {}; no-op", attachmentId, newStatus);
      return attachment;
    }

    if (!currentStatus.canTransitionTo(newStatus)) {
      throw AttachmentConflictException.invalidScanStatusTransition(currentStatus, newStatus);
    }

    attachment.setScanStatus(newStatus.name());
    BlockAttachmentEntity saved = attachmentRepository.save(attachment);

    log.info(
        "Attachment scan status transitioned: id={}, from={}, to={}",
        attachmentId,
        currentStatus,
        newStatus);

    return saved;
  }
}
