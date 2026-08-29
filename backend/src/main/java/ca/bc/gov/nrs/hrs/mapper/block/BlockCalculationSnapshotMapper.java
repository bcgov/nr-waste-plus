package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationSnapshotDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;

/** Maps calculation snapshot persistence objects. */
public final class BlockCalculationSnapshotMapper {
  private BlockCalculationSnapshotMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static BlockCalculationSnapshotDto toDto(BlockCalculationSnapshotEntity entity) {
    return new BlockCalculationSnapshotDto(entity.getId(), entity.getBlockId(),
        entity.getDistrictVolumeId(), entity.getHbsWindowStart(), entity.getHbsWindowEnd(),
        entity.getInputs(), entity.getOutputs(), entity.getCalculatedAt(),
        entity.getRoundingPolicy(), entity.getWarnings());
  }

  /** Converts a complete DTO to a new immutable snapshot entity. */
  public static BlockCalculationSnapshotEntity toEntity(BlockCalculationSnapshotDto dto) {
    return new BlockCalculationSnapshotEntity(
        dto.blockId(),
        dto.districtVolumeId(),
        dto.hbsWindowStart(),
        dto.hbsWindowEnd(),
        dto.inputs(),
        dto.outputs(),
        dto.calculatedAt(),
        dto.roundingPolicy(),
        dto.warnings(),
        null,
        null,
        null,
        null);
  }
}
