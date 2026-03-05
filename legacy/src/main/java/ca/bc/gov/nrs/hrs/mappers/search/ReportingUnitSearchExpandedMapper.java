package ca.bc.gov.nrs.hrs.mappers.search;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.SearchExpandedSecondaryDto;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchExpandedProjection;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import ca.bc.gov.nrs.hrs.mappers.MapperConstants;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * MapStruct mapper for converting between ReportingUnitSearchExpandedProjection and
 * ReportingUnitSearchExpandedDto.
 *
 * <p>This mapper handles the transformation of projection query results into DTOs used in
 * search API responses. It performs custom mappings for the attachment, multiMark, exempted, and
 * totalBlocks fields to ensure proper data conversion and type transformations.</p>
 *
 * <p>This is an abstract class (rather than an interface) so that the Spring-managed
 * {@link ObjectMapper} can be injected and reused for JSON deserialization of secondary
 * marks, keeping configuration, modules, and observability consistent with the rest of
 * the application.</p>
 */
@Slf4j
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public abstract class ReportingUnitSearchExpandedMapper implements
    AbstractSingleMapper<ReportingUnitSearchExpandedDto, ReportingUnitSearchExpandedProjection> {

  private static final TypeReference<List<SearchExpandedSecondaryDto>> SECONDARY_TYPE_REF =
      new TypeReference<>() {};

  @Autowired
  private ObjectMapper objectMapper;

  /**
   * Converts a ReportingUnitSearchExpandedProjection to a ReportingUnitSearchExpandedDto.
   *
   * <p>This method performs the following transformations:
   * <ul>
   *   <li>Converts attachment ID to {@link ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto}</li>
   *   <li>Transforms the multiMark integer (0/1) to a boolean value</li>
   *   <li>Transforms the exempted integer (0/1) to a boolean value</li>
   *   <li>Maps totalBlockCount to totalBlocks</li>
   *   <li>Deserializes the secondary marks JSON string into a list of
   *       {@link SearchExpandedSecondaryDto}</li>
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
      expression = "java(Integer.valueOf(1).equals(projection.getMultiMark().intValue()))"
  )
  @Mapping(
      target = "exempted",
      expression = "java(Integer.valueOf(1).equals(projection.getExempted().intValue()))"
  )
  @Mapping(
      target = "totalBlocks",
      expression = "java(projection.getTotalBlockCount().longValue())"
  )
  @Mapping(
      target = "secondaryMarks",
      expression = "java(parseSecondaryJson(projection.getSecondary()))"
  )
  @Mapping(
      target = "totalChildren",
      expression = "java(projection.getTotalChildCount() != null ? projection.getTotalChildCount().longValue() : 0)"

  )
  @Mapping(target = "status", expression = MapperConstants.STATUS_AS_DTO)
  public abstract ReportingUnitSearchExpandedDto fromProjection(
      ReportingUnitSearchExpandedProjection projection
  );

  /**
   * Deserializes a JSON string into a list of {@link SearchExpandedSecondaryDto}.
   *
   * <p>Uses the Spring-configured {@link ObjectMapper} so that any custom modules,
   * serialization settings, and logging/observability remain consistent with the
   * rest of the application.</p>
   *
   * @param json the JSON string representing secondary marks, may be {@code null} or blank
   * @return a list of {@link SearchExpandedSecondaryDto}, or an empty list when the input
   *         is {@code null}, blank, or cannot be parsed
   */
  protected List<SearchExpandedSecondaryDto> parseSecondaryJson(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }

    try {
      return objectMapper.readValue(json, SECONDARY_TYPE_REF);
    } catch (Exception e) {
      log.error("Failed to parse secondary marks JSON: {}", json, e);
      return List.of();
    }
  }


}
