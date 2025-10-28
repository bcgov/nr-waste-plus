package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity;
import ca.bc.gov.nrs.hrs.mappers.AbstractSingleMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * Mapper that converts organization-unit projections into {@link CodeDescriptionDto} objects
 * suitable for frontend code lists.
 *
 * <p>Maps fields from {@link OrgUnitEntity} to the common code/description DTO. The mapper
 * is configured as a Spring component and ignores unmapped targets to permit partial mappings.</p>
 */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface DistrictMapper extends
    AbstractSingleMapper<CodeDescriptionDto, OrgUnitEntity> {

  /**
   * Map fields from {@link OrgUnitEntity} projection to {@link CodeDescriptionDto}.
   *
   * @param projection the org-unit entity used as a projection source
   * @return the mapped {@link CodeDescriptionDto}
   */
  @Override
  @Mapping(target = "code", source = "orgUnitCode")
  @Mapping(target = "description", source = "orgUnitName")
  CodeDescriptionDto fromProjection(OrgUnitEntity projection);
}
