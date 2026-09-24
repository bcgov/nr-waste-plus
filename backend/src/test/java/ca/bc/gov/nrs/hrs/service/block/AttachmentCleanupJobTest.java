package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import ca.bc.gov.nrs.hrs.configuration.AttachmentCleanupProperties;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import java.time.Duration;
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
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Attachment Cleanup Job")
class AttachmentCleanupJobTest {

  @Mock
  private BlockAttachmentRepository attachmentRepository;

  @Mock
  private ObjectStorageProvider objectStorage;

  @Spy
  private AttachmentCleanupProperties properties =
      AttachmentCleanupProperties.builder()
          .ttl(Duration.ofHours(24))
          .enabled(true)
          .cron("0 0 * * * *")
          .build();

  @InjectMocks
  private AttachmentCleanupJob cleanupJob;

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
  @DisplayName("Purges UPLOADING row past TTL and deletes storage object")
  void cleanAbandonedUploads_purgesStaleRowAndStorageObject() {
    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(List.of(staleAttachment));

    int purged = cleanupJob.cleanAbandonedUploads();

    assertThat(purged).isEqualTo(1);
    verify(objectStorage).deleteObject("hrs/block/2/attachment/101/abandoned.pdf");
    verify(attachmentRepository).delete(staleAttachment);
  }

  @Test
  @DisplayName("Leaves recent UPLOADING rows untouched (none returned by cutoff query)")
  void cleanAbandonedUploads_leavesRecentRowsUntouched() {
    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(Collections.emptyList());

    int purged = cleanupJob.cleanAbandonedUploads();

    assertThat(purged).isZero();
    verify(objectStorage, never()).deleteObject(any());
    verify(attachmentRepository, never()).delete(any());
  }

  @Test
  @DisplayName("Only queries for UPLOADING status, keeping FINALIZED rows untouched")
  void cleanAbandonedUploads_onlySelectsUploadingStatus() {
    cleanupJob.cleanAbandonedUploads();

    ArgumentCaptor<String> statusCaptor = ArgumentCaptor.forClass(String.class);
    verify(attachmentRepository)
        .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
            statusCaptor.capture(), any(Instant.class), any(Pageable.class));

    assertThat(statusCaptor.getValue()).isEqualTo(AttachmentStatus.UPLOADING.name());
  }

  @Test
  @DisplayName("Job is idempotent: running twice has no additional effect")
  void cleanAbandonedUploads_isIdempotent() {
    // First run finds 1 stale row
    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(List.of(staleAttachment))
        .willReturn(Collections.emptyList()); // Second run finds 0

    int firstRun = cleanupJob.cleanAbandonedUploads();
    int secondRun = cleanupJob.cleanAbandonedUploads();

    assertThat(firstRun).isEqualTo(1);
    assertThat(secondRun).isZero();

    verify(objectStorage, times(1)).deleteObject("hrs/block/2/attachment/101/abandoned.pdf");
    verify(attachmentRepository, times(1)).delete(staleAttachment);
  }

  @Test
  @DisplayName("Retains database record when storage object deletion throws an error")
  void cleanAbandonedUploads_whenStorageFails_retainsDbRecord() {
    given(
            attachmentRepository
                .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                    eq(AttachmentStatus.UPLOADING.name()), any(Instant.class), any(Pageable.class)))
        .willReturn(List.of(staleAttachment));
    doThrow(new RuntimeException("S3 connection reset"))
        .when(objectStorage)
        .deleteObject("hrs/block/2/attachment/101/abandoned.pdf");

    int purged = cleanupJob.cleanAbandonedUploads();

    assertThat(purged).isZero();
    verify(attachmentRepository, never()).delete(staleAttachment);
  }
}
