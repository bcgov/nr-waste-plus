package ca.bc.gov.nrs.hrs.mappers.search;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchExpandedProjection;
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
public interface ReportingUnitSearchExpandedMapper extends
    AbstractSingleMapper<ReportingUnitSearchExpandedDto, ReportingUnitSearchExpandedProjection> {

  @Override
  @Mapping(target = "attachment", expression = MapperConstants.ATTACHMENT_AS_DTO)
  @Mapping(
      target = "multiMark",
      expression = "java(Integer.valueOf(1).equals(projection.getMultiMark()))"
  )
  @Mapping(
      target = "exempted",
      expression = "java(Integer.valueOf(1).equals(projection.getExempted()))"
  )
  @Mapping(
      target = "totalBlocks",
      expression = "java(projection.getTotalBlockCount())"
  )
  ReportingUnitSearchExpandedDto fromProjection(ReportingUnitSearchExpandedProjection projection);

}
