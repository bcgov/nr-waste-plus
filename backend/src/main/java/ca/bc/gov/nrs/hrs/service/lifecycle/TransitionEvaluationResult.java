package ca.bc.gov.nrs.hrs.service.lifecycle;

/**
 * Result produced by the transition policy engine when evaluating a lifecycle state transition.
 *
 * @param allowed true when the transition is permitted, false otherwise
 * @param targetState resultant state if allowed; null when denied
 * @param reason descriptive explanation of denial, or null when allowed
 */
public record TransitionEvaluationResult(
    boolean allowed,
    String targetState,
    String reason) {

  /** Creates an allowed evaluation result targeting the specified state. */
  public static TransitionEvaluationResult allowed(String targetState) {
    return new TransitionEvaluationResult(true, targetState, null);
  }

  /** Creates a denied evaluation result with the specified explanation. */
  public static TransitionEvaluationResult denied(String reason) {
    return new TransitionEvaluationResult(false, null, reason);
  }
}
