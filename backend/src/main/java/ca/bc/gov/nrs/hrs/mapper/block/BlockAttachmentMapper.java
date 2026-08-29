package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockAttachmentDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;

/** Maps block-attachment persistence objects. */
public final class BlockAttachmentMapper {
  private BlockAttachmentMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockAttachmentDto toDto(BlockAttachmentEntity entity) {
    return new BlockAttachmentDto(entity.getId(), entity.getBlockId(), entity.getObjectKey(),
        entity.getFileName(), entity.getContentType(), entity.getFileSizeBytes(),
        entity.getScanStatus());
  }

  /** Converts a DTO to a new entity. */
  public static BlockAttachmentEntity toEntity(BlockAttachmentDto dto) {
    var entity = new BlockAttachmentEntity();
    entity.setId(dto.id());
    entity.setBlockId(dto.blockId());
    entity.setObjectKey(dto.objectKey());
    entity.setFileName(dto.fileName());
    entity.setContentType(dto.contentType());
    entity.setFileSizeBytes(dto.fileSizeBytes());
    entity.setScanStatus(dto.scanStatus());
    return entity;
  }
}
