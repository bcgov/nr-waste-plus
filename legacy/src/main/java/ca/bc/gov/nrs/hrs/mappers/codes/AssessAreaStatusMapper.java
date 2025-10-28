package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.entity.codes.AssessAreaStatusEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper for assess-area status code table entries.
 *
 * <p>This mapper converts between {@link AssessAreaStatusEntity} and the shared
 * {@code CodeDescriptionDto} representation via the {@link CodeTableMapper} base interface. It is
 * configured as a Spring component and ignores unmapped targets to allow partial mapping.</p>
 */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface AssessAreaStatusMapper extends CodeTableMapper<AssessAreaStatusEntity> {

}
