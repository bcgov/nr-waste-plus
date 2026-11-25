package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/** Read/create repository for append-only status events. */
@Repository
public interface StatusEventRepository
    extends org.springframework.data.repository.Repository<StatusEventEntity, Long> {

  StatusEventEntity save(StatusEventEntity entity);

  Optional<StatusEventEntity> findById(Long id);

  /** Returns the most recent status event recorded for a block, if any. */
  Optional<StatusEventEntity> findFirstByBlockIdOrderByCreatedAtDesc(Long blockId);

  /** Returns the most recent status event recorded for a block with id tiebreaker. */
  Optional<StatusEventEntity> findFirstByBlockIdOrderByCreatedAtDescIdDesc(Long blockId);

  /** Returns the first status event recorded for a block with a given status, if any. */
  Optional<StatusEventEntity> findFirstByBlockIdAndStatusOrderByCreatedAtAsc(
      Long blockId, String status);

  /** Returns the most recent status event recorded for a block with a given event type. */
  Optional<StatusEventEntity> findFirstByBlockIdAndEventTypeOrderByCreatedAtDesc(
      Long blockId, String eventType);

  /** Returns the most recent status event recorded for a reporting unit, if any. */
  Optional<StatusEventEntity> findFirstByReportingUnitIdOrderByCreatedAtDescIdDesc(
      Long reportingUnitId);

  /** Returns all status events recorded for a block in chronological order. */
  List<StatusEventEntity> findByBlockIdOrderByCreatedAtAscIdAsc(Long blockId);

  /** Returns all status events recorded for a reporting unit in chronological order. */
  List<StatusEventEntity> findByReportingUnitIdOrderByCreatedAtAscIdAsc(Long reportingUnitId);
}
