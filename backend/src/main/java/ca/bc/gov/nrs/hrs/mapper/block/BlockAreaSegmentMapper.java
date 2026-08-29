package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockAreaSegmentDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockAreaSegmentEntity;

/** Maps block-area-segment persistence objects. */
public final class BlockAreaSegmentMapper {
  private BlockAreaSegmentMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockAreaSegmentDto toDto(BlockAreaSegmentEntity entity) {
    return new BlockAreaSegmentDto(entity.getId(), entity.getBlockId(), entity.getSource(),
        entity.getAreaHa(), entity.getRoadLengthM(), entity.getRoadWidthM(),
        entity.getBlockMarkId(), entity.getStartingAreaHa(), entity.getNetWasteAreaHa());
  }

  /** Converts a DTO to a new entity. */
  public static BlockAreaSegmentEntity toEntity(BlockAreaSegmentDto dto) {
    var entity = new BlockAreaSegmentEntity();
    entity.setId(dto.id());
    entity.setBlockId(dto.blockId());
    entity.setSource(dto.source());
    entity.setAreaHa(dto.areaHa());
    entity.setRoadLengthM(dto.roadLengthM());
    entity.setRoadWidthM(dto.roadWidthM());
    entity.setBlockMarkId(dto.blockMarkId());
    entity.setStartingAreaHa(dto.startingAreaHa());
    entity.setNetWasteAreaHa(dto.netWasteAreaHa());
    return entity;
  }
}
