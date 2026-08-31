package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.DistrictAverageBlockDto;
import ca.bc.gov.nrs.hrs.entity.block.DistrictAverageBlockEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Mapper for district-average block extensions. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DistrictAverageBlockMapper {

  /** Maps an extension entity to its DTO. */
  DistrictAverageBlockDto toDto(DistrictAverageBlockEntity entity);

  /** Maps a DTO to a new extension entity. */
  DistrictAverageBlockEntity toEntity(DistrictAverageBlockDto dto);
}
