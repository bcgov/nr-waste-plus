package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCommentDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps block-comment persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockCommentMapper {

  /** Converts an entity to a persistence DTO. */
  BlockCommentDto toDto(BlockCommentEntity entity);

  /** Converts a DTO to a new entity. */
  BlockCommentEntity toEntity(BlockCommentDto dto);
}
