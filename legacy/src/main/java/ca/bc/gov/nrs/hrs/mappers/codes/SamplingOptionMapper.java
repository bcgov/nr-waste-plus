package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.entity.codes.SamplingOptionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface SamplingOptionMapper extends CodeTableMapper<SamplingOptionEntity> {

}
