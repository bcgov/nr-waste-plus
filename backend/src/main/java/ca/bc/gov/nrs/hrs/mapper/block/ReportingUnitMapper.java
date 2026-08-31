package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.ReportingUnitDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Maps reporting-unit persistence objects. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ReportingUnitMapper {

  /** Converts an entity to a persistence DTO. */
  ReportingUnitDto toDto(ReportingUnitEntity entity);

  /** Converts a DTO to a new entity. */
  ReportingUnitEntity toEntity(ReportingUnitDto dto);
}
