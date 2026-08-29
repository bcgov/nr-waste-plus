package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCommentDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;

/** Maps block-comment persistence objects. */
public final class BlockCommentMapper {
  private BlockCommentMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockCommentDto toDto(BlockCommentEntity entity) {
    return new BlockCommentDto(entity.getId(), entity.getBlockId(), entity.getContext(),
        entity.getComment(), entity.getStatusEventId());
  }

  /** Converts a DTO to a new entity. */
  public static BlockCommentEntity toEntity(BlockCommentDto dto) {
    var entity = new BlockCommentEntity();
    entity.setId(dto.id());
    entity.setBlockId(dto.blockId());
    entity.setContext(dto.context());
    entity.setComment(dto.comment());
    entity.setStatusEventId(dto.statusEventId());
    return entity;
  }
}
