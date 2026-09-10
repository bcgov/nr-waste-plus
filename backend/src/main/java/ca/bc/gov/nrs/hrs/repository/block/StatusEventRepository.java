package ca.bc.gov.nrs.hrs.repository.block;

import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import org.springframework.stereotype.Repository;

/** Read/create repository for append-only status events. */
@Repository
public interface StatusEventRepository
    extends org.springframework.data.repository.Repository<StatusEventEntity, Long> {

  StatusEventEntity save(StatusEventEntity entity);

  java.util.Optional<StatusEventEntity> findById(Long id);
}
