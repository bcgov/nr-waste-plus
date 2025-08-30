package ca.bc.gov.nrs.hrs.mappers.search;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchProjection;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import ca.bc.gov.nrs.hrs.mappers.MapperConstants;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;
import org.springframework.stereotype.Component;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ReportingUnitSearchMapper extends
    AbstractSingleMapper<ReportingUnitSearchResultDto, ReportingUnitSearchProjection> {

  @Override
  @Mapping(target = "status", expression = MapperConstants.STATUS_AS_DTO)
  @Mapping(target = "sampling", expression = MapperConstants.SAMPLING_AS_DTO)
  @Mapping(target = "district", expression = MapperConstants.DISTRICT_AS_DTO)
  @Mapping(target = "clientLocation", expression = MapperConstants.CLIENT_LOCATION_AS_DTO)
  @Mapping(target = "client", expression = MapperConstants.CLIENT_AS_DTO)
  ReportingUnitSearchResultDto fromProjection(ReportingUnitSearchProjection projection);

}
