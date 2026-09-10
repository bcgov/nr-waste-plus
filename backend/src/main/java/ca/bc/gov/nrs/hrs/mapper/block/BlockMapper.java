package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCreateDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockDetailDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Mapper for block resources. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockMapper {

  /** Maps a persisted block to its detail representation. */
  BlockDetailDto toDetailDto(BlockEntity entity);

  /** Maps a create payload to a new entity. */
  BlockEntity toEntity(BlockCreateDto dto);
}
