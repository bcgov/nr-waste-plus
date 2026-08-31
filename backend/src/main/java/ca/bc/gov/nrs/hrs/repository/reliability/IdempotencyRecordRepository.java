package ca.bc.gov.nrs.hrs.repository.reliability;

import ca.bc.gov.nrs.hrs.entity.reliability.IdempotencyRecordEntity;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/** Minimal repository surface for request idempotency records. */
@Repository
public interface IdempotencyRecordRepository extends CrudRepository<IdempotencyRecordEntity, Long> {

  IdempotencyRecordEntity save(IdempotencyRecordEntity entity);

  Optional<IdempotencyRecordEntity> findById(Long id);

  Optional<IdempotencyRecordEntity> findByIdempotencyKey(String idempotencyKey);
}
