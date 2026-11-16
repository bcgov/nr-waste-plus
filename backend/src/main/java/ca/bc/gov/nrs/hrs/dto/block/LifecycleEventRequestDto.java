package ca.bc.gov.nrs.hrs.dto.block;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload for triggering a lifecycle event on a reporting unit or block.
 *
 * @param event the lifecycle transition event name; must not be blank
 * @param comment optional comment accompanying the lifecycle transition
 */
public record LifecycleEventRequestDto(
    @NotBlank(message = "Event is required")
    String event,

    @Size(max = 4000, message = "Comment must not exceed 4000 characters")
    String comment) {}
