package ca.bc.gov.nrs.hrs.service.block;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import ca.bc.gov.nrs.hrs.configuration.AttachmentCleanupProperties;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Attachment Cleanup Job")
class AttachmentCleanupJobTest {

  @Mock
  private AttachmentPurgeService purgeService;

  @Spy
  private AttachmentCleanupProperties properties =
      AttachmentCleanupProperties.builder()
          .ttl(Duration.ofHours(24))
          .enabled(true)
          .cron("0 0 * * * *")
          .build();

  @InjectMocks
  private AttachmentCleanupJob cleanupJob;

  @Test
  @DisplayName("Loops through batches while batch size is full (100) and sums total")
  void cleanAbandonedUploads_loopsAcrossFullBatches() {
    given(purgeService.purgeBatch(any(Instant.class), eq(100)))
        .willReturn(100)
        .willReturn(35);

    int purged = cleanupJob.cleanAbandonedUploads();

    assertThat(purged).isEqualTo(135);
    verify(purgeService, times(2)).purgeBatch(any(Instant.class), eq(100));
  }

  @Test
  @DisplayName("Terminates after single batch when batch size is less than 100")
  void cleanAbandonedUploads_terminatesWhenBatchNotFull() {
    given(purgeService.purgeBatch(any(Instant.class), eq(100))).willReturn(12);

    int purged = cleanupJob.cleanAbandonedUploads();

    assertThat(purged).isEqualTo(12);
    verify(purgeService, times(1)).purgeBatch(any(Instant.class), eq(100));
  }

  @Test
  @DisplayName("Returns 0 when initial batch is empty")
  void cleanAbandonedUploads_returnsZeroWhenEmpty() {
    given(purgeService.purgeBatch(any(Instant.class), eq(100))).willReturn(0);

    int purged = cleanupJob.cleanAbandonedUploads();

    assertThat(purged).isZero();
    verify(purgeService, times(1)).purgeBatch(any(Instant.class), eq(100));
  }

  @Test
  @DisplayName("Passes cutoff timestamp based on configured TTL")
  void cleanAbandonedUploads_passesTtlBasedCutoff() {
    Instant before = Instant.now().minus(Duration.ofHours(24));
    cleanupJob.cleanAbandonedUploads();
    Instant after = Instant.now().minus(Duration.ofHours(24));

    ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
    verify(purgeService).purgeBatch(cutoffCaptor.capture(), eq(100));

    assertThat(cutoffCaptor.getValue())
        .isAfterOrEqualTo(before.minusSeconds(1))
        .isBeforeOrEqualTo(after.plusSeconds(1));
  }
}
