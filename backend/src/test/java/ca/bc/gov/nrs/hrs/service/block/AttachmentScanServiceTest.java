package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.exception.AttachmentConflictException;
import ca.bc.gov.nrs.hrs.exception.AttachmentNotFoundException;
import ca.bc.gov.nrs.hrs.provider.scanner.AttachmentScanner;
import ca.bc.gov.nrs.hrs.provider.scanner.ScannerUnavailableException;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Attachment Scan Service")
class AttachmentScanServiceTest {

  private static final long ATTACHMENT_ID = 501L;
  private static final long BLOCK_ID = 2L;
  private static final String OBJECT_KEY = "hrs/block/2/attachment/501/map.pdf";

  @Mock
  private BlockAttachmentRepository attachmentRepository;

  @Mock
  private AttachmentScanner scanner;

  @InjectMocks
  private AttachmentScanService scanService;

  private BlockAttachmentEntity entity;

  @BeforeEach
  void setUp() {
    entity = new BlockAttachmentEntity();
    entity.setId(ATTACHMENT_ID);
    entity.setBlockId(BLOCK_ID);
    entity.setObjectKey(OBJECT_KEY);
    entity.setStatus(AttachmentStatus.FINALIZED.name());
    entity.setScanStatus(AttachmentScanStatus.PENDING.name());
  }

  // --- Scan state transitions ---

  @Test
  @DisplayName("Acquires pessimistic write lock when updating scan status")
  void updateScanStatus_acquiresPessimisticWriteLock() {
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));

    scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN);

    verify(attachmentRepository).findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID);
    verify(attachmentRepository, never()).findByIdAndDeletedFalse(ATTACHMENT_ID);
  }

  @Test
  @DisplayName("Transitions from PENDING to CLEAN")
  void updateScanStatus_fromPendingToClean_succeeds() {
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));

    BlockAttachmentEntity updated =
        scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN);

    assertThat(updated.getScanStatus()).isEqualTo(AttachmentScanStatus.CLEAN.name());
    verify(attachmentRepository).save(entity);
  }

  @Test
  @DisplayName("Transitions from PENDING to QUARANTINED")
  void updateScanStatus_fromPendingToQuarantined_succeeds() {
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));

    BlockAttachmentEntity updated =
        scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.QUARANTINED);

    assertThat(updated.getScanStatus()).isEqualTo(AttachmentScanStatus.QUARANTINED.name());
    verify(attachmentRepository).save(entity);
  }

  @Test
  @DisplayName("Transitions from PENDING to FAILED")
  void updateScanStatus_fromPendingToFailed_succeeds() {
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));

    BlockAttachmentEntity updated =
        scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.FAILED);

    assertThat(updated.getScanStatus()).isEqualTo(AttachmentScanStatus.FAILED.name());
    verify(attachmentRepository).save(entity);
  }

  @ParameterizedTest
  @EnumSource(
      value = AttachmentScanStatus.class,
      names = {"CLEAN", "QUARANTINED", "FAILED", "PENDING"})
  @DisplayName("Transitioning to the same status is idempotent")
  void updateScanStatus_sameStatus_isIdempotent(AttachmentScanStatus status) {
    entity.setScanStatus(status.name());
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    BlockAttachmentEntity updated = scanService.updateScanStatus(ATTACHMENT_ID, status);

    assertThat(updated.getScanStatus()).isEqualTo(status.name());
    verify(attachmentRepository, never()).save(any());
  }

  @Test
  @DisplayName("Rejects transition from CLEAN to QUARANTINED with 409 Conflict")
  void updateScanStatus_fromCleanToQuarantined_fails() {
    entity.setScanStatus(AttachmentScanStatus.CLEAN.name());
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    assertThatThrownBy(
            () -> scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.QUARANTINED))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((AttachmentConflictException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Rejects transition from QUARANTINED to CLEAN with 409 Conflict")
  void updateScanStatus_fromQuarantinedToClean_fails() {
    entity.setScanStatus(AttachmentScanStatus.QUARANTINED.name());
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    assertThatThrownBy(
            () -> scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((AttachmentConflictException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Rejects transition from FAILED to CLEAN with 409 Conflict")
  void updateScanStatus_fromFailedToClean_fails() {
    entity.setScanStatus(AttachmentScanStatus.FAILED.name());
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    assertThatThrownBy(
            () -> scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((AttachmentConflictException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Rejects update when expected blockId does not match attachment")
  void updateScanStatus_mismatchedBlockId_throwsNotFound() {
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    assertThatThrownBy(
            () -> scanService.updateScanStatus(ATTACHMENT_ID, 999L, AttachmentScanStatus.CLEAN))
        .isInstanceOf(AttachmentNotFoundException.class)
        .satisfies(
            e ->
                assertThat(((AttachmentNotFoundException) e).getStatusCode())
                    .isEqualTo(HttpStatus.NOT_FOUND));
  }

  // --- Fail-closed scanning behavior ---

  @Test
  @DisplayName("Scanner unavailable -> attachment stays PENDING (fail-closed)")
  void scan_scannerUnavailable_staysPending() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(scanner.scan(ATTACHMENT_ID, OBJECT_KEY))
        .willThrow(new ScannerUnavailableException("Service unreachable"));

    AttachmentScanStatus status = scanService.scan(ATTACHMENT_ID);

    assertThat(status).isEqualTo(AttachmentScanStatus.PENDING);
    assertThat(entity.getScanStatus()).isEqualTo(AttachmentScanStatus.PENDING.name());
    verify(attachmentRepository, never()).save(any());
  }

  @Test
  @DisplayName("Scanner unexpected exception -> attachment stays PENDING (fail-closed)")
  void scan_scannerUnexpectedException_staysPending() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(scanner.scan(ATTACHMENT_ID, OBJECT_KEY))
        .willThrow(new RuntimeException("Connection timeout"));

    AttachmentScanStatus status = scanService.scan(ATTACHMENT_ID);

    assertThat(status).isEqualTo(AttachmentScanStatus.PENDING);
    assertThat(entity.getScanStatus()).isEqualTo(AttachmentScanStatus.PENDING.name());
    verify(attachmentRepository, never()).save(any());
  }

  @Test
  @DisplayName("Scanner returns CLEAN -> transitions to CLEAN")
  void scan_scannerReturnsClean_transitionsToClean() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));
    given(scanner.scan(ATTACHMENT_ID, OBJECT_KEY)).willReturn(AttachmentScanStatus.CLEAN);

    AttachmentScanStatus status = scanService.scan(ATTACHMENT_ID);

    assertThat(status).isEqualTo(AttachmentScanStatus.CLEAN);
    assertThat(entity.getScanStatus()).isEqualTo(AttachmentScanStatus.CLEAN.name());
    verify(attachmentRepository).save(entity);
  }

  @Test
  @DisplayName("Scanner returns QUARANTINED -> transitions to QUARANTINED")
  void scan_scannerReturnsQuarantined_transitionsToQuarantined() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));
    given(scanner.scan(ATTACHMENT_ID, OBJECT_KEY)).willReturn(AttachmentScanStatus.QUARANTINED);

    AttachmentScanStatus status = scanService.scan(ATTACHMENT_ID);

    assertThat(status).isEqualTo(AttachmentScanStatus.QUARANTINED);
    assertThat(entity.getScanStatus()).isEqualTo(AttachmentScanStatus.QUARANTINED.name());
    verify(attachmentRepository).save(entity);
  }

  @Test
  @DisplayName("Scanner returns FAILED -> transitions to FAILED")
  void scan_scannerReturnsFailed_transitionsToFailed() {
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));
    given(scanner.scan(ATTACHMENT_ID, OBJECT_KEY)).willReturn(AttachmentScanStatus.FAILED);

    AttachmentScanStatus status = scanService.scan(ATTACHMENT_ID);

    assertThat(status).isEqualTo(AttachmentScanStatus.FAILED);
    assertThat(entity.getScanStatus()).isEqualTo(AttachmentScanStatus.FAILED.name());
    verify(attachmentRepository).save(entity);
  }

  @Test
  @DisplayName("Rejects scan if attachment is not yet FINALIZED")
  void scan_unfinalizedAttachment_throwsConflict() {
    entity.setStatus(AttachmentStatus.UPLOADING.name());
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    assertThatThrownBy(() -> scanService.scan(ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((AttachmentConflictException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Rejects updateScanStatus if attachment is not yet FINALIZED")
  void updateScanStatus_unfinalizedAttachment_throwsConflict() {
    entity.setStatus(AttachmentStatus.UPLOADING.name());
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    assertThatThrownBy(
            () -> scanService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((AttachmentConflictException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("scan rethrows AttachmentConflictException when updateScanStatus encounters conflict")
  void scan_whenUpdateScanStatusThrowsConflict_rethrowsConflict() {
    entity.setScanStatus(AttachmentScanStatus.QUARANTINED.name());
    given(attachmentRepository.findByIdAndDeletedFalse(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(scanner.scan(ATTACHMENT_ID, OBJECT_KEY)).willReturn(AttachmentScanStatus.CLEAN);

    assertThatThrownBy(() -> scanService.scan(ATTACHMENT_ID))
        .isInstanceOf(AttachmentConflictException.class);
  }

  @Test
  @DisplayName("fromDb safely resolves valid, null, empty, and unrecognized strings")
  void fromDb_resolvesSafely() {
    assertThat(AttachmentScanStatus.fromDb("CLEAN")).isEqualTo(AttachmentScanStatus.CLEAN);
    assertThat(AttachmentScanStatus.fromDb("clean")).isEqualTo(AttachmentScanStatus.CLEAN);
    assertThat(AttachmentScanStatus.fromDb(null)).isEqualTo(AttachmentScanStatus.PENDING);
    assertThat(AttachmentScanStatus.fromDb("")).isEqualTo(AttachmentScanStatus.PENDING);
    assertThat(AttachmentScanStatus.fromDb("  ")).isEqualTo(AttachmentScanStatus.PENDING);
    assertThat(AttachmentScanStatus.fromDb("UNKNOWN_GARBAGE"))
        .isEqualTo(AttachmentScanStatus.PENDING);
  }
}

