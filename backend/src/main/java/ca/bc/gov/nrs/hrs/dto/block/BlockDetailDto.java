package ca.bc.gov.nrs.hrs.dto.block;

import java.time.LocalDate;

/** Minimal block resource representation for downstream endpoint contracts. */
public record BlockDetailDto(Long id, Long reportingUnitId, String blockType, boolean draft,
    LocalDate plcDate, Long revision) {}
