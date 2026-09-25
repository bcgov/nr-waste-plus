package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.configuration.AttachmentCleanupProperties;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to purge abandoned attachment upload intents.
 *
 * <p>Coordinates scheduled execution across paged batches, delegating transactional purge
 * operations to {@link AttachmentPurgeService} to ensure each batch commits independently without
 * holding long-lived database transactions or open connection locks during external storage calls.
 */
@Component
@ConditionalOnProperty(
    prefix = "ca.bc.gov.nrs.attachment.cleanup",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
@Observed
public class AttachmentCleanupJob {

  private static final int BATCH_SIZE = 100;

  private final AttachmentPurgeService purgeService;
  private final AttachmentCleanupProperties properties;

  /**
   * Purges abandoned upload intents older than the configured TTL in paged batches.
   *
   * <p>Note: This method is intentionally not transactional so database transactions and
   * connections are not held open across multiple batches or during S3 calls.
   *
   * @return the number of purged attachments
   */
  @Scheduled(cron = "${ca.bc.gov.nrs.attachment.cleanup.cron}")
  @NewSpan
  public int cleanAbandonedUploads() {
    Instant cutoff = Instant.now().minus(properties.getTtl());
    int totalPurged = 0;

    int purgedInBatch;
    do {
      purgedInBatch = purgeService.purgeBatch(cutoff, BATCH_SIZE);
      totalPurged += purgedInBatch;
    } while (purgedInBatch == BATCH_SIZE);

    if (totalPurged > 0) {
      log.info("Purged {} abandoned attachment intent(s).", totalPurged);
    }
    return totalPurged;
  }
}
