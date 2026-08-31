package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.StatusEventDto;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps status-event persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface StatusEventMapper {

  /** Converts an entity to a persistence DTO. */
  StatusEventDto toDto(StatusEventEntity entity);

  /** Converts a DTO to a new entity. */
  StatusEventEntity toEntity(StatusEventDto dto);
}
