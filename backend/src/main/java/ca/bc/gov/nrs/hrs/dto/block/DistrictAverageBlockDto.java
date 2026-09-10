package ca.bc.gov.nrs.hrs.dto.block;

import java.math.BigDecimal;
import java.util.List;

/** District-average extension payload. */
public record DistrictAverageBlockDto(Long blockId, String benchmarkZone, String maturity,
    BigDecimal retentionPercentage, List<Integer> criteria, BigDecimal coastGroundBasedAreaHa,
    BigDecimal coastHelicopterAreaHa, String harvestStatusCode, String becZone,
    String becSubvariant, Boolean hasDispersedRetention, BigDecimal dispersedRetentionPct,
    BigDecimal cableYardingAreaHa, BigDecimal skylineLoggingAreaHa) {}
