package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.codes.BaseCodeTableEntity;
import ca.bc.gov.nrs.hrs.mappers.AbstractMutualMapper;
import org.mapstruct.Mapping;


/**
 * Base mapper interface for simple code tables that map to {@link CodeDescriptionDto}.
 *
 * <p>Provides two-way conversions between {@link BaseCodeTableEntity} subtypes and
 * {@link CodeDescriptionDto}. The interface declares MapStruct mappings for the common
 * fields such as code <-> id and supplies qualifiers for timestamps and default values
 * via the {@link AbstractMutualMapper} helpers.</p>
 */
public interface CodeTableMapper<T extends BaseCodeTableEntity> extends
    AbstractMutualMapper<CodeDescriptionDto, T> {

  /**
   * Map the code-table entity's identifier to the DTO {@code code} field.
   *
   * @param entity the entity instance to convert
   * @return the mapped {@link CodeDescriptionDto}
   */
  @Override
  @Mapping(target = "code", source = "id")
  CodeDescriptionDto toDto(T entity);

  /**
   * Map a {@link CodeDescriptionDto} to a concrete {@code T} entity instance.
   *
   * <p>In addition to mapping the {@code code->id}, this mapping initializes
   * timestamp fields using qualifiers defined on {@link AbstractMutualMapper}.</p>
   *
   * @param dto the source DTO
   * @return the mapped entity instance of type {@code T}
   */
  @Override
  @Mapping(source = "code", target = "id")
  @Mapping(
      source = "code",
      target = "effectiveDate",
      qualifiedByName = "CurrentDateTimeQualifier"
  )
  @Mapping(
      source = "code",
      target = "expiryDate",
      qualifiedByName = "MaxDateTimeQualifier"
  )
  @Mapping(
      source = "code",
      target = "updateTimestamp",
      qualifiedByName = "CurrentDateTimeQualifier"
  )
  T toEntity(CodeDescriptionDto dto);
}
