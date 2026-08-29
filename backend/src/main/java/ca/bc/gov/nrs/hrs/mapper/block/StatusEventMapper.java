package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.StatusEventDto;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;

/** Maps status-event persistence objects. */
public final class StatusEventMapper {
  private StatusEventMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static StatusEventDto toDto(StatusEventEntity entity) {
    return new StatusEventDto(entity.getId(), entity.getReportingUnitId(), entity.getBlockId(),
        entity.getStatus(), entity.getEventType(), entity.getDetails());
  }

  /** Converts a DTO to a new entity. */
  public static StatusEventEntity toEntity(StatusEventDto dto) {
    var entity = new StatusEventEntity();
    entity.setId(dto.id());
    entity.setReportingUnitId(dto.reportingUnitId());
    entity.setBlockId(dto.blockId());
    entity.setStatus(dto.status());
    entity.setEventType(dto.eventType());
    entity.setDetails(dto.details());
    return entity;
  }
}
