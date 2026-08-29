package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import org.springframework.data.repository.Repository;

/** Read/create repository for append-only status events. */
public interface StatusEventRepository extends Repository<StatusEventEntity, Long> {

  StatusEventEntity save(StatusEventEntity entity);

  java.util.Optional<StatusEventEntity> findById(Long id);
}
