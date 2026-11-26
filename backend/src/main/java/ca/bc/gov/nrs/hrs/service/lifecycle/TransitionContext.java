package ca.bc.gov.nrs.hrs.service.lifecycle;

import java.time.LocalDate;

/**
 * Contextual attributes evaluated by the transition policy engine.
 *
 * @param plcDate planned completion date of the block, or null when unavailable
 * @param submissionDate effective submission date; defaults to today when null
 * @param approvedDate date the block entered {@code SUBMISSION_APPROVED}, or null when unavailable
 * @param rationaleRequired whether rationale was required and answered yes
 * @param burntPiles whether burnt piles requirement was answered yes
 */
public record TransitionContext(
    LocalDate plcDate,
    LocalDate submissionDate,
    LocalDate approvedDate,
    boolean rationaleRequired,
    boolean burntPiles) {

  /** Convenience constructor without {@code approvedDate}. */
  public TransitionContext(
      LocalDate plcDate,
      LocalDate submissionDate,
      boolean rationaleRequired,
      boolean burntPiles) {
    this(plcDate, submissionDate, null, rationaleRequired, burntPiles);
  }

  /** Returns an empty transition context with default values. */
  public static TransitionContext empty() {
    return new TransitionContext(null, null, null, false, false);
  }
}
