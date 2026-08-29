package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockSubmitterDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockSubmitterEntity;

/** Maps block-submitter persistence objects. */
public final class BlockSubmitterMapper {
  private BlockSubmitterMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockSubmitterDto toDto(BlockSubmitterEntity entity) {
    return new BlockSubmitterDto(entity.getId(), entity.getBlockId(), entity.getSubmitterId(),
        entity.getSubmitterName(), entity.getFirstName(), entity.getLastName(),
        entity.getDesignation(), entity.getLicenceNo(), entity.getEmail(), entity.getPhone());
  }

  /** Converts a DTO to a new entity. */
  public static BlockSubmitterEntity toEntity(BlockSubmitterDto dto) {
    var entity = new BlockSubmitterEntity();
    entity.setId(dto.id());
    entity.setBlockId(dto.blockId());
    entity.setSubmitterId(dto.submitterId());
    entity.setSubmitterName(dto.submitterName());
    entity.setFirstName(dto.firstName());
    entity.setLastName(dto.lastName());
    entity.setDesignation(dto.designation());
    entity.setLicenceNo(dto.licenceNo());
    entity.setEmail(dto.email());
    entity.setPhone(dto.phone());
    return entity;
  }
}
