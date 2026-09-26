package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Repository for block attachments. */
@Repository
public interface BlockAttachmentRepository extends JpaRepository<BlockAttachmentEntity, Long> {

  /** Returns the non-deleted attachment with the given identifier, if present. */
  Optional<BlockAttachmentEntity> findByIdAndDeletedFalse(Long id);

  /**
   * Returns the non-deleted attachment with the given identifier, acquiring a pessimistic
   * write lock ({@code SELECT ... FOR UPDATE}) to serialize state transitions.
   *
   * @param id the attachment identifier
   * @return optional containing the locked entity if present
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT a FROM BlockAttachmentEntity a WHERE a.id = :id AND a.deleted = false")
  Optional<BlockAttachmentEntity> findByIdAndDeletedFalseForUpdate(@Param("id") Long id);

  /**
   * Finds abandoned upload intents older than the cutoff timestamp using a lock-skip strategy
   * to prevent multi-pod race conditions, matching partial index
   * {@code idx_block_attachment_uploading_cleanup}.
   *
   * @param status the upload lifecycle status (e.g. UPLOADING)
   * @param cutoff the timestamp cutoff
   * @param pageable pagination limit and sorting
   * @return list of stale attachment entities
   */
  @QueryHints(value = {@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2")})
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  List<BlockAttachmentEntity>
      findByStatusAndDeletedFalseAndCreatedAtBeforeOrderByCreatedAtAsc(
          String status, Instant cutoff, Pageable pageable);

  /**
   * Counts the number of active attachments for a block matching the specified upload status
   * and scan status.
   *
   * @param blockId the block identifier
   * @param status the upload lifecycle status
   * @param scanStatus the malware scan status
   * @return count of matching non-deleted attachments
   */
  long countByBlockIdAndStatusAndScanStatusAndDeletedFalse(
      Long blockId, String status, String scanStatus);

  /**
   * Finds all active attachments for a block matching the specified upload status and scan status.
   *
   * @param blockId the block identifier
   * @param status the upload lifecycle status
   * @param scanStatus the malware scan status
   * @return list of matching non-deleted attachments
   */
  List<BlockAttachmentEntity> findByBlockIdAndStatusAndScanStatusAndDeletedFalse(
      Long blockId, String status, String scanStatus);
}
