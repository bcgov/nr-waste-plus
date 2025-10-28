package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.entity.codes.SamplingOptionEntity;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper for sampling option code table entries.
 *
 * <p>Extends {@link CodeTableMapper} to provide conversions between
 * {@link SamplingOptionEntity} and {@code CodeDescriptionDto}. Configured as a Spring component and
 * ignores unmapped targets.</p>
 */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface SamplingOptionMapper extends CodeTableMapper<SamplingOptionEntity> {

}
