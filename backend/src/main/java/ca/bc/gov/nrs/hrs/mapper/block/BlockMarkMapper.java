package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockMarkDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps block-mark persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockMarkMapper {

  /** Converts an entity to a persistence DTO. */
  BlockMarkDto toDto(BlockMarkEntity entity);

  /** Converts a DTO to a new entity. */
  BlockMarkEntity toEntity(BlockMarkDto dto);
}
