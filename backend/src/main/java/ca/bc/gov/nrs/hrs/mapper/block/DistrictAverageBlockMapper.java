package ca.bc.gov.nrs.hrs.mapper.block;

import ca.bc.gov.nrs.hrs.dto.block.DistrictAverageBlockDto;
import ca.bc.gov.nrs.hrs.entity.block.DistrictAverageBlockEntity;

/** Mapper for district-average block extensions. */
public final class DistrictAverageBlockMapper {
  private DistrictAverageBlockMapper() {}

  /** Maps an extension entity to its DTO. */
  public static DistrictAverageBlockDto toDto(DistrictAverageBlockEntity entity) {
    return new DistrictAverageBlockDto(entity.getBlockId(), entity.getBenchmarkZone(),
        entity.getMaturity(), entity.getRetentionPercentage(), entity.getCriteria(),
        entity.getCoastGroundBasedAreaHa(), entity.getCoastHelicopterAreaHa(),
        entity.getHarvestStatusCode(), entity.getBecZone(), entity.getBecSubvariant(),
        entity.getHasDispersedRetention(), entity.getDispersedRetentionPct(),
        entity.getCableYardingAreaHa(), entity.getSkylineLoggingAreaHa());
  }

  /** Maps a DTO to a new extension entity. */
  public static DistrictAverageBlockEntity toEntity(DistrictAverageBlockDto dto) {
    var entity = new DistrictAverageBlockEntity();
    entity.setBlockId(dto.blockId());
    entity.setBenchmarkZone(dto.benchmarkZone());
    entity.setMaturity(dto.maturity());
    entity.setRetentionPercentage(dto.retentionPercentage());
    entity.setCriteria(dto.criteria());
    entity.setCoastGroundBasedAreaHa(dto.coastGroundBasedAreaHa());
    entity.setCoastHelicopterAreaHa(dto.coastHelicopterAreaHa());
    entity.setHarvestStatusCode(dto.harvestStatusCode());
    entity.setBecZone(dto.becZone());
    entity.setBecSubvariant(dto.becSubvariant());
    entity.setHasDispersedRetention(dto.hasDispersedRetention());
    entity.setDispersedRetentionPct(dto.dispersedRetentionPct());
    entity.setCableYardingAreaHa(dto.cableYardingAreaHa());
    entity.setSkylineLoggingAreaHa(dto.skylineLoggingAreaHa());
    return entity;
  }
}
