package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockSponsorDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockSponsorEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps block-sponsor persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockSponsorMapper {

  /** Converts an entity to a persistence DTO. */
  BlockSponsorDto toDto(BlockSponsorEntity entity);

  /** Converts a DTO to a new entity. */
  BlockSponsorEntity toEntity(BlockSponsorDto dto);
}
