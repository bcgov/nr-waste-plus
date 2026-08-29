package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockSponsorDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockSponsorEntity;

/** Maps block-sponsor persistence objects. */
public final class BlockSponsorMapper {
  private BlockSponsorMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockSponsorDto toDto(BlockSponsorEntity entity) {
    return new BlockSponsorDto(entity.getId(), entity.getBlockId(), entity.getSponsorId(),
        entity.getSponsorName(), entity.getFirstName(), entity.getLastName(),
        entity.getDesignation(), entity.getLicenceNo(), entity.getEmail(), entity.getPhone());
  }

  /** Converts a DTO to a new entity. */
  public static BlockSponsorEntity toEntity(BlockSponsorDto dto) {
    var entity = new BlockSponsorEntity();
    entity.setId(dto.id());
    entity.setBlockId(dto.blockId());
    entity.setSponsorId(dto.sponsorId());
    entity.setSponsorName(dto.sponsorName());
    entity.setFirstName(dto.firstName());
    entity.setLastName(dto.lastName());
    entity.setDesignation(dto.designation());
    entity.setLicenceNo(dto.licenceNo());
    entity.setEmail(dto.email());
    entity.setPhone(dto.phone());
    return entity;
  }
}
