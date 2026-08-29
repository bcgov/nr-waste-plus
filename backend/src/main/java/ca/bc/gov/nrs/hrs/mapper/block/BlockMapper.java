package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCreateDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockDetailDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;

/** Mapper for block resources. */
public final class BlockMapper {
  private BlockMapper() {}

  /** Maps a persisted block to its detail representation. */
  public static BlockDetailDto toDetailDto(BlockEntity entity) {
    return new BlockDetailDto(entity.getId(), entity.getReportingUnitId(), entity.getBlockType(),
        entity.isDraft(), entity.getPlcDate(), entity.getRevision());
  }

  /** Maps a create payload to a new entity. */
  public static BlockEntity toEntity(BlockCreateDto dto) {
    var entity = new BlockEntity();
    entity.setReportingUnitId(dto.reportingUnitId());
    entity.setBlockType(dto.blockType());
    entity.setDraft(dto.draft());
    entity.setPlcDate(dto.plcDate());
    return entity;
  }
}
