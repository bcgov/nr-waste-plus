package ca.bc.gov.nrs.hrs.repository.reliability;

import ca.bc.gov.nrs.hrs.entity.reliability.OutboxEventEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Minimal repository surface for transactional outbox records. */
@org.springframework.stereotype.Repository
public interface OutboxEventRepository extends Repository<OutboxEventEntity, Long> {

  OutboxEventEntity save(OutboxEventEntity entity);

  Optional<OutboxEventEntity> findById(Long id);

  Optional<OutboxEventEntity> findByEventId(UUID eventId);
}
