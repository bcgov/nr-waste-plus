package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockAttachmentDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps block-attachment persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockAttachmentMapper {

  /** Converts an entity to a persistence DTO. */
  BlockAttachmentDto toDto(BlockAttachmentEntity entity);

  /** Converts a DTO to a new entity. */
  BlockAttachmentEntity toEntity(BlockAttachmentDto dto);
}
