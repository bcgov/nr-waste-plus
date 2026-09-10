package ca.bc.gov.nrs.hrs.dto.block;

import java.time.LocalDate;

/** Minimal block creation payload. */
public record BlockCreateDto(Long reportingUnitId, String blockType, boolean draft,
    LocalDate plcDate) {}
