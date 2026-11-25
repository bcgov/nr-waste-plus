package ca.bc.gov.nrs.hrs.dto.block;

/**
 * Result of querying lifecycle details, pairing the view payload with the subject's revision.
 *
 * @param details the lifecycle state, available events, and transition history
 * @param revision the current optimistic revision backing the ETag header
 */
public record LifecycleViewResult(
    LifecycleDetailsDto details,
    Long revision) {}
