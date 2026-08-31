package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationSnapshotDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * Maps persisted calculation snapshots to their DTO representation.
 *
 * <p>Creation is intentionally not exposed here: audit fields are populated by the
 * persistence lifecycle or by the explicit persistable entity constructor, never invented by a
 * mapper.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockCalculationSnapshotMapper {

  /** Converts an entity to a persistence DTO. */
  BlockCalculationSnapshotDto toDto(BlockCalculationSnapshotEntity entity);
}
