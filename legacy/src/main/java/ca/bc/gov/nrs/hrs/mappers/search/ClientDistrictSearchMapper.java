package ca.bc.gov.nrs.hrs.mappers.search;

import ca.bc.gov.nrs.hrs.dto.search.ClientDistrictSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.search.ClientDistrictSearchProjection;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import ca.bc.gov.nrs.hrs.mappers.MapperConstants;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ClientDistrictSearchMapper extends
    AbstractSingleMapper<ClientDistrictSearchResultDto, ClientDistrictSearchProjection> {

  @Override
  @Mapping(target = "client", expression = MapperConstants.CLIENT_AS_DTO)
  ClientDistrictSearchResultDto fromProjection(ClientDistrictSearchProjection projection);

}
