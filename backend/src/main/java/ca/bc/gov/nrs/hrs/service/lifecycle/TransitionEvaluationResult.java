package ca.bc.gov.nrs.hrs.service.lifecycle;

/**
 * Result produced by the transition policy engine when evaluating a lifecycle state transition or
 * edit permission.
 *
 * @param allowed true when the transition or edit is permitted, false otherwise
 * @param targetState resultant state if allowed; null when denied or for edit checks
 * @param externalStep optional external step name (e.g. {@code HBS_INVOICE_POST}) that must succeed
 * @param reason descriptive explanation of denial, or null when allowed
 * @param denialReason structured category of denial, or null when allowed
 */
public record TransitionEvaluationResult(
    boolean allowed,
    String targetState,
    String externalStep,
    String reason,
    DenialReason denialReason) {

  /** Reason category when a transition or edit evaluation is denied. */
  public enum DenialReason {
    ROLE_NOT_ALLOWED,
    ILLEGAL_TRANSITION,
    COMMENT_REQUIRED,
    PRECONDITION_FAILED,
    STATE_NOT_EDITABLE
  }

  /** Creates an allowed evaluation result targeting the specified state with no external step. */
  public static TransitionEvaluationResult allowed(String targetState) {
    return new TransitionEvaluationResult(true, targetState, null, null, null);
  }

  /** Creates an allowed evaluation result with an optional external step. */
  public static TransitionEvaluationResult allowed(String targetState, String externalStep) {
    return new TransitionEvaluationResult(true, targetState, externalStep, null, null);
  }

  /** Creates an allowed edit-permission result. */
  public static TransitionEvaluationResult editAllowed() {
    return new TransitionEvaluationResult(true, null, null, null, null);
  }

  /** Creates a denied evaluation result for an illegal transition. */
  public static TransitionEvaluationResult denied(String reason) {
    return new TransitionEvaluationResult(
        false, null, null, reason, DenialReason.ILLEGAL_TRANSITION);
  }

  /** Creates a denied evaluation result because the caller lacks the required role. */
  public static TransitionEvaluationResult forbidden(String reason) {
    return new TransitionEvaluationResult(
        false, null, null, reason, DenialReason.ROLE_NOT_ALLOWED);
  }

  /** Creates a denied evaluation result because a required comment was missing. */
  public static TransitionEvaluationResult commentRequired(String reason) {
    return new TransitionEvaluationResult(
        false, null, null, reason, DenialReason.COMMENT_REQUIRED);
  }

  /** Creates a denied evaluation result because a transition precondition failed. */
  public static TransitionEvaluationResult preconditionFailed(String reason) {
    return new TransitionEvaluationResult(
        false, null, null, reason, DenialReason.PRECONDITION_FAILED);
  }

  /** Creates a denied evaluation result because the current state is not editable. */
  public static TransitionEvaluationResult stateNotEditable(String reason) {
    return new TransitionEvaluationResult(
        false, null, null, reason, DenialReason.STATE_NOT_EDITABLE);
  }
}
