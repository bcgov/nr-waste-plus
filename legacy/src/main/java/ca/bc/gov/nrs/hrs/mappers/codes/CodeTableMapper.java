package ca.bc.gov.nrs.hrs.mappers.codes;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.codes.BaseCodeTableEntity;
import ca.bc.gov.nrs.hrs.mappers.AbstractMutualMapper;
import org.mapstruct.Mapping;


public interface CodeTableMapper<T extends BaseCodeTableEntity> extends
    AbstractMutualMapper<CodeDescriptionDto, T> {

  @Override
  @Mapping(target = "code", source = "id")
  CodeDescriptionDto toDto(T entity);

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
