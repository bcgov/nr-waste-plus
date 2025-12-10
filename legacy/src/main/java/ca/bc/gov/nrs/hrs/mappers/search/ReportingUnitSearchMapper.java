package ca.bc.gov.nrs.hrs.mappers.search;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchProjection;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import ca.bc.gov.nrs.hrs.mappers.MapperConstants;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper converting a {@link ReportingUnitSearchProjection} returned from queries into a
 * {@link ReportingUnitSearchResultDto} used by the API.
 *
 * <p>The mapper uses expressions from {@link MapperConstants} to produce nested
 * {@code CodeDescriptionDto} values for fields such as status, sampling and district.</p>
 *
 * <p>Configured with Spring component model and ignores unmapped targets to allow
 * mapping from partial projection results.</p>
 */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ReportingUnitSearchMapper extends
    AbstractSingleMapper<ReportingUnitSearchResultDto, ReportingUnitSearchProjection> {

  /**
   * Map a {@link ReportingUnitSearchProjection} to a {@link ReportingUnitSearchResultDto}.
   *
   * <p>The mapping uses expressions defined in {@link MapperConstants} to construct nested
   * {@code CodeDescriptionDto} instances for the {@code status}, {@code sampling},
   * {@code district}, {@code clientLocation} and {@code client} fields.</p>
   *
   * @param projection the projection returned by repository queries
   * @return the mapped {@link ReportingUnitSearchResultDto}
   */
  @Override
  @Mapping(target = "status", expression = MapperConstants.STATUS_AS_DTO)
  @Mapping(target = "sampling", expression = MapperConstants.SAMPLING_AS_DTO)
  @Mapping(target = "district", expression = MapperConstants.DISTRICT_AS_DTO)
  @Mapping(target = "client", expression = MapperConstants.CLIENT_AS_DTO)
  ReportingUnitSearchResultDto fromProjection(ReportingUnitSearchProjection projection);

}
