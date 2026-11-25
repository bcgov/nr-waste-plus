package ca.bc.gov.nrs.hrs.dto.block;

import java.util.List;

/**
 * Details of the current lifecycle state, available events, and transition history.
 *
 * @param state current lifecycle state of the subject
 * @param availableEvents events the caller is permitted to execute from the current state
 * @param history chronological sequence of past transitions recorded for the subject
 */
public record LifecycleDetailsDto(
    String state,
    List<AvailableLifecycleEventDto> availableEvents,
    List<LifecycleHistoryItemDto> history) {}
