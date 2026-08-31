package ca.bc.gov.nrs.hrs.repository.reliability;

import ca.bc.gov.nrs.hrs.entity.reliability.IdempotencyRecordEntity;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/** Minimal repository surface for request idempotency records. */
@org.springframework.stereotype.Repository
public interface IdempotencyRecordRepository extends Repository<IdempotencyRecordEntity, Long> {

  IdempotencyRecordEntity save(IdempotencyRecordEntity entity);

  Optional<IdempotencyRecordEntity> findById(Long id);

  Optional<IdempotencyRecordEntity> findByIdempotencyKey(String idempotencyKey);
}
