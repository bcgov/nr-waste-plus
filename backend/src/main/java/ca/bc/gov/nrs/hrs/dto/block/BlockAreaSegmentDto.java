package ca.bc.gov.nrs.hrs.dto.block;

import java.math.BigDecimal;

/** Block-area-segment persistence projection. */
public record BlockAreaSegmentDto(Long id, Long blockId, String source, BigDecimal areaHa,
    BigDecimal roadLengthM, BigDecimal roadWidthM, Long blockMarkId, BigDecimal startingAreaHa,
    BigDecimal netWasteAreaHa) {}
