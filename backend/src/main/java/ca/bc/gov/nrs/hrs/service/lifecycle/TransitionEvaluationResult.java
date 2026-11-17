package ca.bc.gov.nrs.hrs.service.lifecycle;

/**
 * Result produced by the transition policy engine when evaluating a lifecycle state transition.
 *
 * @param allowed true when the transition is permitted, false otherwise
 * @param targetState resultant state if allowed; null when denied
 * @param reason descriptive explanation of denial, or null when allowed
 * @param denialReason category of denial (e.g. ILLEGAL_STATE vs FORBIDDEN_ROLE)
 */
public record TransitionEvaluationResult(
    boolean allowed,
    String targetState,
    String reason,
    DenialReason denialReason) {

  /** Reason category when a transition evaluation is denied. */
  public enum DenialReason {
    ILLEGAL_STATE,
    FORBIDDEN_ROLE
  }

  /** Creates an allowed evaluation result targeting the specified state. */
  public static TransitionEvaluationResult allowed(String targetState) {
    return new TransitionEvaluationResult(true, targetState, null, null);
  }

  /** Creates a denied evaluation result with the specified explanation for an illegal state. */
  public static TransitionEvaluationResult denied(String reason) {
    return new TransitionEvaluationResult(false, null, reason, DenialReason.ILLEGAL_STATE);
  }

  /** Creates a denied evaluation result because the caller lacks the required role. */
  public static TransitionEvaluationResult forbidden(String reason) {
    return new TransitionEvaluationResult(false, null, reason, DenialReason.FORBIDDEN_ROLE);
  }
}
