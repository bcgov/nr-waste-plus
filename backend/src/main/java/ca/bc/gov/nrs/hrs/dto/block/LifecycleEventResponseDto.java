package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;

/**
 * Response returned upon a successful lifecycle event transition.
 *
 * @param reportingUnitId target reporting unit identifier; never null
 * @param blockId target block identifier; null for reporting-unit-scoped transitions
 * @param previousState lifecycle state before the transition occurred
 * @param state new lifecycle state resulting from the transition
 * @param event the event name that triggered the transition
 * @param version updated aggregate revision backing the ETag header
 * @param occurredAt timestamp when the lifecycle status event was recorded
 */
public record LifecycleEventResponseDto(
    Long reportingUnitId,
    Long blockId,
    String previousState,
    String state,
    String event,
    Long version,
    Instant occurredAt) {}
