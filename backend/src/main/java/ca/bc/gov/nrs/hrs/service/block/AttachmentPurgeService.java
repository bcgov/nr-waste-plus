package ca.bc.gov.nrs.hrs.service.block;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import io.micrometer.observation.annotation.Observed;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service to execute a single batch purge of abandoned attachment upload intents.
 *
 * <p>Each batch execution runs within its own independent transaction so database locks
 * and transactions are not held across multiple batches during scheduled cleanup.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Observed
public class AttachmentPurgeService {

  private final BlockAttachmentRepository attachmentRepository;
  private final ObjectStorageProvider objectStorage;

  /**
   * Purges a single batch of stale attachments within its own discrete transaction.
   *
   * @param cutoff the timestamp cutoff
   * @param batchSize the maximum number of items to purge in this batch
   * @return count of successfully purged attachments in this batch
   */
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public int purgeBatch(Instant cutoff, int batchSize) {
    List<BlockAttachmentEntity> stale =
        attachmentRepository
            .findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
                AttachmentStatus.UPLOADING.name(), cutoff, PageRequest.of(0, batchSize));

    if (stale.isEmpty()) {
      return 0;
    }

    return deleteFromStorageAndRepository(stale);
  }

  /**
   * Purges a single batch of soft-deleted attachments from object storage and removes their
   * metadata rows once object removal succeeds. Retains rows when storage deletion fails so
   * cleanup can retry.
   *
   * @param batchSize the maximum number of items to purge in this batch
   * @return count of successfully purged soft-deleted attachments in this batch
   */
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public int purgeSoftDeletedBatch(int batchSize) {
    List<BlockAttachmentEntity> deleted =
        attachmentRepository.findByDeletedTrueOrderByUpdatedAtAsc(PageRequest.of(0, batchSize));

    if (deleted.isEmpty()) {
      return 0;
    }

    return deleteFromStorageAndRepository(deleted);
  }

  private int deleteFromStorageAndRepository(List<BlockAttachmentEntity> entities) {
    int count = 0;
    for (BlockAttachmentEntity entity : entities) {
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
