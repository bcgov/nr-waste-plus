package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.entity.codes.AssessAreaStatusEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface AssessAreaStatusMapper extends CodeTableMapper<AssessAreaStatusEntity> {

}
