package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockMarkDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockMarkEntity;

/** Maps block-mark persistence objects. */
public final class BlockMarkMapper {
  private BlockMarkMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockMarkDto toDto(BlockMarkEntity entity) {
    return new BlockMarkDto(entity.getId(), entity.getBlockId(), entity.getMarkType(),
        entity.getSequenceNo(), entity.getMark(), entity.getValidationStatus(),
        entity.getForestFileId(), entity.getTimberMark(), entity.getCuttingPermitId(),
        entity.getCutBlockId());
  }

  /** Converts a DTO to a new entity. */
  public static BlockMarkEntity toEntity(BlockMarkDto dto) {
    var entity = new BlockMarkEntity();
    entity.setId(dto.id());
    entity.setBlockId(dto.blockId());
    entity.setMarkType(dto.markType());
    entity.setSequenceNo(dto.sequenceNo());
    entity.setMark(dto.mark());
    entity.setValidationStatus(dto.validationStatus());
    entity.setForestFileId(dto.forestFileId());
    entity.setTimberMark(dto.timberMark());
    entity.setCuttingPermitId(dto.cuttingPermitId());
    entity.setCutBlockId(dto.cutBlockId());
    return entity;
  }
}
