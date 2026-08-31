package ca.bc.gov.nrs.hrs.repository.reliability;

import ca.bc.gov.nrs.hrs.entity.reliability.OutboxEventEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/** Minimal repository surface for transactional outbox records. */
@Repository
public interface OutboxEventRepository extends CrudRepository<OutboxEventEntity, Long> {

  OutboxEventEntity save(OutboxEventEntity entity);

  Optional<OutboxEventEntity> findById(Long id);

  Optional<OutboxEventEntity> findByEventId(UUID eventId);
}
