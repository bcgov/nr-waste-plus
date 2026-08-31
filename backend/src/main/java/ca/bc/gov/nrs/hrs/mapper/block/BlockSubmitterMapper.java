package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockSubmitterDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps block-submitter persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockSubmitterMapper {

  /** Converts an entity to a persistence DTO. */
  BlockSubmitterDto toDto(BlockSubmitterEntity entity);

  /** Converts a DTO to a new entity. */
  BlockSubmitterEntity toEntity(BlockSubmitterDto dto);
}
