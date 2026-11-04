package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;
import java.time.LocalDate;

/** Representation of a block resource returned upon creation and item lookup. */
public record BlockResponseDto(
    Long id,
    Long reportingUnitId,
    String blockType,
    String state,
    boolean draft,
    LocalDate plcDate,
    Long version,
    Long revision,
    boolean isLegacy,
    Instant createdAt,
    Instant updatedAt) {}
