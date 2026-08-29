package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.ReportingUnitDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;

/** Maps reporting-unit persistence objects. */
public final class ReportingUnitMapper {
  private ReportingUnitMapper() {}

  /** Converts an entity to a persistence DTO. */
  public static ReportingUnitDto toDto(ReportingUnitEntity entity) {
    return new ReportingUnitDto(entity.getId(), entity.getClientNumber(),
        entity.getClientLocnCode(), entity.getOrgUnitNo(), entity.getRevision());
  }

  /** Converts a DTO to a new entity. */
  public static ReportingUnitEntity toEntity(ReportingUnitDto dto) {
    var entity = new ReportingUnitEntity();
    entity.setId(dto.id());
    entity.setClientNumber(dto.clientNumber());
    entity.setClientLocnCode(dto.clientLocnCode());
    entity.setOrgUnitNo(dto.orgUnitNo());
    entity.setRevision(dto.revision());
    return entity;
  }
}
