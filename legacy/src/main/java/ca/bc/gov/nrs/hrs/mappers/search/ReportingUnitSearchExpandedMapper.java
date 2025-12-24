package ca.bc.gov.nrs.hrs.mappers.search;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchExpandedProjection;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import ca.bc.gov.nrs.hrs.mappers.MapperConstants;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct mapper for converting between ReportingUnitSearchExpandedProjection and
 * ReportingUnitSearchExpandedDto.
 *
 * <p>This mapper handles the transformation of projection query results into DTOs used in
 * search API responses. It performs custom mappings for the attachment, multiMark, exempted,
 * and totalBlocks fields to ensure proper data conversion and type transformations.</p>
 */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface ReportingUnitSearchExpandedMapper extends
    AbstractSingleMapper<ReportingUnitSearchExpandedDto, ReportingUnitSearchExpandedProjection> {

  /**
   * Converts a ReportingUnitSearchExpandedProjection to a ReportingUnitSearchExpandedDto.
   *
   * <p>This method performs the following transformations:
   * <ul>
   *   <li>Converts attachment ID to {@link ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto}</li>
   *   <li>Transforms the multiMark integer (0/1) to a boolean value</li>
   *   <li>Transforms the exempted integer (0/1) to a boolean value</li>
   *   <li>Maps totalBlockCount to totalBlocks</li>
   * </ul>
   * </p>
   *
   * @param projection the projection containing the source data
   * @return a fully mapped {@link ReportingUnitSearchExpandedDto}
   */
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
