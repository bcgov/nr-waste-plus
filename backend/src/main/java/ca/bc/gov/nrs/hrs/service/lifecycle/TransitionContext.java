package ca.bc.gov.nrs.hrs.service.lifecycle;

import java.time.LocalDate;

/**
 * Contextual attributes evaluated by the transition policy engine.
 *
 * @param plcDate planned completion date of the block, or null when unavailable
 * @param submissionDate effective submission date; defaults to today when null
 * @param rationaleRequired whether rationale was required and answered yes
 * @param burntPiles whether burnt piles requirement was answered yes
 */
public record TransitionContext(
    LocalDate plcDate,
    LocalDate submissionDate,
    boolean rationaleRequired,
    boolean burntPiles) {

  /** Returns an empty transition context with default values. */
  public static TransitionContext empty() {
    return new TransitionContext(null, null, false, false);
  }
}
