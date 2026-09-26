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
@DisplayName("Unit Test | Attachment Scan Status Service")
class AttachmentScanStatusServiceTest {

  private static final long ATTACHMENT_ID = 501L;
  private static final long BLOCK_ID = 2L;
  private static final String OBJECT_KEY = "hrs/block/2/attachment/501/map.pdf";

  @Mock
  private BlockAttachmentRepository attachmentRepository;

  @InjectMocks
  private AttachmentScanStatusService statusService;

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

  @Test
  @DisplayName("Acquires pessimistic write lock when updating scan status")
  void updateScanStatus_acquiresPessimisticWriteLock() {
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));
    given(attachmentRepository.save(any(BlockAttachmentEntity.class)))
        .willAnswer(inv -> inv.getArgument(0));

    statusService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN);

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
        statusService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN);

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
        statusService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.QUARANTINED);

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
        statusService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.FAILED);

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

    BlockAttachmentEntity updated = statusService.updateScanStatus(ATTACHMENT_ID, status);

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
            () -> statusService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.QUARANTINED))
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
            () -> statusService.updateScanStatus(ATTACHMENT_ID, AttachmentScanStatus.CLEAN))
        .isInstanceOf(AttachmentConflictException.class)
        .satisfies(
            e ->
                assertThat(((AttachmentConflictException) e).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("Rejects updateScanStatus if expectedBlockId does not match")
  void updateScanStatus_mismatchedBlockId_throwsNotFound() {
    given(attachmentRepository.findByIdAndDeletedFalseForUpdate(ATTACHMENT_ID))
        .willReturn(Optional.of(entity));

    assertThatThrownBy(
            () -> statusService.updateScanStatus(ATTACHMENT_ID, 999L, AttachmentScanStatus.CLEAN))
        .isInstanceOf(AttachmentNotFoundException.class);
  }
}
