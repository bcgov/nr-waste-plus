package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockAreaSegmentDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockAreaSegmentEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps block-area-segment persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockAreaSegmentMapper {

  /** Converts an entity to a persistence DTO. */
  BlockAreaSegmentDto toDto(BlockAreaSegmentEntity entity);

  /** Converts a DTO to a new entity. */
  BlockAreaSegmentEntity toEntity(BlockAreaSegmentDto dto);
}
