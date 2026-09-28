package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Attachment Purge Service")
class AttachmentPurgeServiceTest {

  @Mock
  private BlockAttachmentRepository attachmentRepository;

  @Mock
  private ObjectStorageProvider objectStorage;

  @InjectMocks
  private AttachmentPurgeService purgeService;

  private BlockAttachmentEntity staleAttachment;

  @BeforeEach
  void setUp() {
    staleAttachment = new BlockAttachmentEntity();
    staleAttachment.setId(101L);
    staleAttachment.setBlockId(2L);
    staleAttachment.setObjectKey("hrs/block/2/attachment/101/abandoned.pdf");
    staleAttachment.setStatus(AttachmentStatus.UPLOADING.name());
    staleAttachment.setScanStatus(AttachmentScanStatus.PENDING.name());
  }

  @Test
  @DisplayName("Purges UPLOADING row past cutoff and deletes storage object")
  void purgeBatch_purgesStaleRowAndStorageObject() {
    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(List.of(staleAttachment));

    int purged = purgeService.purgeBatch(Instant.now(), 100);

    assertThat(purged).isEqualTo(1);
    verify(objectStorage).deleteObject("hrs/block/2/attachment/101/abandoned.pdf");
    verify(attachmentRepository).delete(staleAttachment);
  }

  @Test
  @DisplayName("Returns 0 and performs no deletes when no stale rows are found")
  void purgeBatch_leavesRecentRowsUntouched() {
    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(Collections.emptyList());

    int purged = purgeService.purgeBatch(Instant.now(), 100);

    assertThat(purged).isZero();
    verify(objectStorage, never()).deleteObject(any());
    verify(attachmentRepository, never()).delete(any());
  }

  @Test
  @DisplayName("Only queries for UPLOADING status, keeping FINALIZED rows untouched")
  void purgeBatch_onlySelectsUploadingStatus() {
    purgeService.purgeBatch(Instant.now(), 100);

    ArgumentCaptor<String> statusCaptor = ArgumentCaptor.forClass(String.class);
    verify(attachmentRepository)
        .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
            statusCaptor.capture(), any(Instant.class), any(Pageable.class));

    assertThat(statusCaptor.getValue()).isEqualTo(AttachmentStatus.UPLOADING.name());
  }

  @Test
  @DisplayName("Retains database record when storage object deletion throws an error")
  void purgeBatch_whenStorageFails_retainsDbRecord() {
    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(List.of(staleAttachment));
    doThrow(new RuntimeException("S3 connection reset"))
        .when(objectStorage)
        .deleteObject("hrs/block/2/attachment/101/abandoned.pdf");

    int purged = purgeService.purgeBatch(Instant.now(), 100);

    assertThat(purged).isZero();
    verify(attachmentRepository, never()).delete(staleAttachment);
  }

  @Test
  @DisplayName("Purges all valid items in batch even if one item fails storage deletion")
  void purgeBatch_whenOneItemFails_continuesProcessingBatch() {
    BlockAttachmentEntity secondAttachment = new BlockAttachmentEntity();
    secondAttachment.setId(102L);
    secondAttachment.setBlockId(2L);
    secondAttachment.setObjectKey("hrs/block/2/attachment/102/abandoned2.pdf");
    secondAttachment.setStatus(AttachmentStatus.UPLOADING.name());

    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(List.of(staleAttachment, secondAttachment));
    doThrow(new RuntimeException("S3 error"))
        .when(objectStorage)
        .deleteObject("hrs/block/2/attachment/101/abandoned.pdf");

    int purged = purgeService.purgeBatch(Instant.now(), 100);

    assertThat(purged).isEqualTo(1);
    verify(attachmentRepository, never()).delete(staleAttachment);
    verify(objectStorage).deleteObject("hrs/block/2/attachment/102/abandoned2.pdf");
    verify(attachmentRepository, times(1)).delete(secondAttachment);
  }
}
