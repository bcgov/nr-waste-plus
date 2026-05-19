package ca.bc.gov.nrs.hrs.mappers.reportingunit;

import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitDetailsProjection;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import ca.bc.gov.nrs.hrs.mappers.MapperConstants;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants.ComponentModel;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper that converts a {@link ReportingUnitDetailsProjection} to a
 * {@link ReportingUnitDetailsDto}.
 *
 * <p>The mapper uses expressions from {@link MapperConstants} to construct nested
 * {@code CodeDescriptionDto} instances for the {@code sampling} and {@code district}
 * fields. The district name is cleaned by removing the "Natural Resource District"
 * suffix before it is stored in the description.</p>
 *
 * <p>Configured with Spring component model and ignores unmapped targets to allow
 * mapping from partial projection results.</p>
 */
@Mapper(
    componentModel = ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ReportingUnitDetailsMapper extends
    AbstractSingleMapper<ReportingUnitDetailsDto, ReportingUnitDetailsProjection> {

  /**
   * Converts a {@link ReportingUnitDetailsProjection} to a {@link ReportingUnitDetailsDto}.
   *
   * <p>The {@code sampling} field is mapped using {@link MapperConstants#SAMPLING_AS_DTO} and the
   * {@code district} field using {@link MapperConstants#DISTRICT_AS_DTO}, which trims the
   * "Natural Resource District" suffix from the district name.</p>
   *
   * @param projection the projection returned by the reporting unit details query
   * @return the mapped {@link ReportingUnitDetailsDto}
   */
  @Override
  @Mapping(target = "sampling", expression = MapperConstants.SAMPLING_AS_DTO)
  @Mapping(target = "district", expression = MapperConstants.DISTRICT_AS_DTO)
  ReportingUnitDetailsDto fromProjection(ReportingUnitDetailsProjection projection);


}
