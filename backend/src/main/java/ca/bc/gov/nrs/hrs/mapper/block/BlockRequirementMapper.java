package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockRequirementDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps block-requirement persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockRequirementMapper {

  /** Converts an entity to a persistence DTO. */
  BlockRequirementDto toDto(BlockRequirementEntity entity);

  /** Converts a DTO to a new entity. */
  BlockRequirementEntity toEntity(BlockRequirementDto dto);
}
