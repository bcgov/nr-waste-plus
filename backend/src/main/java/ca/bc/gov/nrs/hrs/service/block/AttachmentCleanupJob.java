package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.configuration.AttachmentCleanupProperties;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Scheduled job to purge abandoned attachment upload intents.
 *
 * <p>Finds {@link BlockAttachmentEntity} rows in {@link AttachmentStatus#UPLOADING} status
 * that are older than the configured TTL, deletes their underlying object in object storage,
 * and deletes the database record. Uses a SKIP LOCKED lock strategy to support multi-pod
 * deployments safely.
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

  private final BlockAttachmentRepository attachmentRepository;
  private final ObjectStorageProvider objectStorage;
  private final AttachmentCleanupProperties properties;

  /**
   * Purges abandoned upload intents older than the configured TTL in paged batches.
   *
   * @return the number of purged attachments
   */
  @Scheduled(cron = "${ca.bc.gov.nrs.attachment.cleanup.cron}")
  @NewSpan
  @Transactional
  public int cleanAbandonedUploads() {
    Instant cutoff = Instant.now().minus(properties.getTtl());
    int totalPurged = 0;

    int purgedInBatch;
    do {
      purgedInBatch = purgeBatch(cutoff);
      totalPurged += purgedInBatch;
    } while (purgedInBatch == BATCH_SIZE);

    if (totalPurged > 0) {
      log.info("Purged {} abandoned attachment intent(s).", totalPurged);
    }
    return totalPurged;
  }

  /**
   * Purges a single batch of stale attachments within its own transaction.
   *
   * @param cutoff the timestamp cutoff
   * @return count of successfully purged attachments in this batch
   */
  @Transactional
  protected int purgeBatch(Instant cutoff) {
    List<BlockAttachmentEntity> stale =
        attachmentRepository
            .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                AttachmentStatus.UPLOADING.name(), cutoff, PageRequest.of(0, BATCH_SIZE));

    if (stale.isEmpty()) {
      return 0;
    }

    int count = 0;
    for (BlockAttachmentEntity entity : stale) {
      try {
        objectStorage.deleteObject(entity.getObjectKey());
        attachmentRepository.delete(entity);
        count++;
      } catch (Exception e) {
        log.warn(
            "Failed to delete object from storage at key {} for attachment id={}: {}. "
                + "Retaining row for next run.",
            entity.getObjectKey(),
            entity.getId(),
            e.getMessage());
      }
    }
    return count;
  }
}
