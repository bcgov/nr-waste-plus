package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.BlockCreateDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockDetailDto;
import ca.bc.gov.nrs.hrs.dto.block.BlockResponseDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/** Mapper for block resources. */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlockMapper {

  /**
   * Maps a persisted block to its detail representation.
   *
   * <p>Persisted blocks are always postgres-owned, so the legacy marker is fixed to {@code false}.
   * Timber marks and waste assessment area summary are populated separately by the service.
   */
  @Mapping(target = "isLegacy", constant = "false")
  @Mapping(target = "secondaryTimberMarks", expression = "java(java.util.List.of())")
  @Mapping(target = "roadPermitTimberMarks", expression = "java(java.util.List.of())")
  @Mapping(target = "wasteAssessmentAreaSummary", expression = "java(null)")
  BlockDetailDto toDetailDto(BlockEntity entity);

  /**
   * Maps a persisted block to its resource response representation.
   *
   * <p>Persisted blocks are always postgres-owned, so the legacy marker is fixed to {@code false}.
   * Timber marks and waste assessment area summary are populated separately by the service.
   */
  @Mapping(target = "state", expression = "java(entity.isDraft() ? \"DRAFT\" : \"ACTIVE\")")
  @Mapping(target = "version", source = "revision")
  @Mapping(target = "isLegacy", constant = "false")
  @Mapping(target = "secondaryTimberMarks", expression = "java(java.util.List.of())")
  @Mapping(target = "roadPermitTimberMarks", expression = "java(java.util.List.of())")
  @Mapping(target = "wasteAssessmentAreaSummary", expression = "java(null)")
  BlockResponseDto toResponseDto(BlockEntity entity);

  /** Maps a create payload to a new entity. */
  BlockEntity toEntity(BlockCreateDto dto);
}
