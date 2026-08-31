package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCalculationSnapshotDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCalculationSnapshotEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps calculation snapshot persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockCalculationSnapshotMapper {

  /** Converts an entity to a persistence DTO. */
  BlockCalculationSnapshotDto toDto(BlockCalculationSnapshotEntity entity);

  /** Converts a complete DTO to a new immutable snapshot entity. */
}
