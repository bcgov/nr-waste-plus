package ca.bc.gov.nrs.hrs.entity.block;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.enhanced.SequenceStyleGenerator;

/**
 * Identifier generator for {@link ReportingUnitEntity} that uses the assigned identifier if
 * present, or falls back to the database sequence if no identifier was provided.
 */
public class ReportingUnitIdGenerator extends SequenceStyleGenerator {

  @Override
  public Object generate(SharedSessionContractImplementor session, Object object) {
    if (object instanceof ReportingUnitEntity entity && entity.getId() != null) {
      return entity.getId();
    }
    return super.generate(session, object);
  }
}

