package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface DistrictMapper extends
    AbstractSingleMapper<CodeDescriptionDto, OrgUnitEntity> {

  @Override
  @Mapping(target = "code", source = "orgUnitCode")
  @Mapping(target = "description", source = "orgUnitName")
  CodeDescriptionDto fromProjection(OrgUnitEntity projection);
}
