package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;

/** Representation of a block resource returned upon creation. */
public record BlockResponseDto(
    Long id,
    Long reportingUnitId,
    String blockType,
    String state,
    boolean draft,
    Long version,
    Long revision,
    Instant createdAt,
    Instant updatedAt) {}
