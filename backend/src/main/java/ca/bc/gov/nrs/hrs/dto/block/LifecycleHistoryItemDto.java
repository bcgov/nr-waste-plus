package ca.bc.gov.nrs.hrs.dto.block;

import java.time.Instant;

/**
 * Historical record of a lifecycle state transition.
 *
 * @param statusEventId unique identifier of the status event row
 * @param event the event code that triggered the transition
 * @param fromState lifecycle state before the transition
 * @param toState lifecycle state after the transition
 * @param actor identifier of the user or system actor that performed the transition
 * @param occurredAt timestamp when the transition was recorded
 * @param comment optional comment accompanying the transition
 */
public record LifecycleHistoryItemDto(
    Long statusEventId,
    String event,
    String fromState,
    String toState,
    String actor,
    Instant occurredAt,
    String comment) {}
