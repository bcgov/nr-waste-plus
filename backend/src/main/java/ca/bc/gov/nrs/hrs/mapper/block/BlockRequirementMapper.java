package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockRequirementDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;

/** Maps block-requirement persistence objects. */
public final class BlockRequirementMapper {
  private BlockRequirementMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockRequirementDto toDto(BlockRequirementEntity entity) {
    return new BlockRequirementDto(entity.getId(), entity.getBlockId(),
        entity.getRequirementCode(), entity.getAnsweredYes(), entity.getResponse(),
        entity.getLinkedAttachmentId());
  }

  /** Converts a DTO to a new entity. */
  public static BlockRequirementEntity toEntity(BlockRequirementDto dto) {
    var entity = new BlockRequirementEntity();
    entity.setId(dto.id());
    entity.setBlockId(dto.blockId());
    entity.setRequirementCode(dto.requirementCode());
    entity.setAnsweredYes(dto.answeredYes());
    entity.setResponse(dto.response());
    entity.setLinkedAttachmentId(dto.linkedAttachmentId());
    return entity;
  }
}
