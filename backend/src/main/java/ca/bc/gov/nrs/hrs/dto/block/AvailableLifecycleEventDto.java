package ca.bc.gov.nrs.hrs.dto.block;

/**
 * Metadata for a lifecycle transition event available to the caller in the current state.
 *
 * @param event the event code (e.g. SUBMIT, APPROVE, REJECT)
 * @param label human-readable action label rendered in the UI
 * @param commentRequired whether a comment is mandatory when triggering this event
 * @param confirmationRequired whether the client should prompt for user confirmation
 */
public record AvailableLifecycleEventDto(
    String event,
    String label,
    boolean commentRequired,
    boolean confirmationRequired) {}
