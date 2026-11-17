package ca.bc.gov.nrs.hrs.service.lifecycle;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Domain policy engine enforcing lifecycle state transitions for blocks and reporting units.
 *
 * <p>Validates state legality, actor roles, identity provider constraints, and hold conditions
 * against a structured transition matrix artifact.
 */
@Service
@Slf4j
public class TransitionPolicyService {

  public static final int DEFAULT_AUTO_APPROVE_MONTHS = 12;

  public static final String STATE_DRAFT = "DRAFT";
  public static final String STATE_SUBMISSION = "SUBMISSION";
  public static final String STATE_SUBMITTED = "SUBMITTED";
  public static final String STATE_HOLD = "HOLD";
  public static final String STATE_SUBMISSION_APPROVED = "SUBMISSION_APPROVED";
  public static final String STATE_APPROVED = "APPROVED";
  public static final String STATE_REJECTED = "REJECTED";
  public static final String STATE_CANCELLED = "CANCELLED";
  public static final String STATE_BILLING_APPROVED = "BILLING_APPROVED";

  public static final String EVENT_SUBMIT = "SUBMIT";
  public static final String EVENT_HOLD = "HOLD";
  public static final String EVENT_UNHOLD = "UNHOLD";
  public static final String EVENT_APPROVE = "APPROVE";
  public static final String EVENT_REJECT = "REJECT";
  public static final String EVENT_CANCEL = "CANCEL";
  public static final String EVENT_AUTO_APPROVE_BILLING = "AUTO_APPROVE_BILLING";
  public static final String EVENT_APPROVE_BILLING = "APPROVE_BILLING";

  private record MatrixEntry(
      String fromState,
      String event,
      Set<Role> allowedRoles,
      Function<TransitionContext, String> targetStateResolver) {}

  private final List<MatrixEntry> transitionMatrix;

  /** Constructs the transition policy service and initializes the immutable transition matrix. */
  public TransitionPolicyService() {
    this.transitionMatrix = Collections.unmodifiableList(initializeMatrix());
  }

  private List<MatrixEntry> initializeMatrix() {
    List<MatrixEntry> matrix = new ArrayList<>();

    Function<TransitionContext, String> submitResolver =
        context -> isHoldConditionMet(context) ? STATE_HOLD : STATE_SUBMITTED;

    Set<Role> submitterAndAdmin = Set.of(Role.SUBMITTER, Role.ADMIN);
    Set<Role> ministryStaffAndAdmin = Set.of(Role.AREA, Role.DISTRICT, Role.ADMIN);

    // DRAFT transitions
    matrix.add(new MatrixEntry(STATE_DRAFT, EVENT_SUBMIT, submitterAndAdmin, submitResolver));
    matrix.add(
        new MatrixEntry(STATE_DRAFT, EVENT_CANCEL, submitterAndAdmin, ctx -> STATE_CANCELLED));

    // SUBMISSION (reporting-unit alias for DRAFT)
    matrix.add(new MatrixEntry(STATE_SUBMISSION, EVENT_SUBMIT, submitterAndAdmin, submitResolver));
    matrix.add(
        new MatrixEntry(STATE_SUBMISSION, EVENT_CANCEL, submitterAndAdmin, ctx -> STATE_CANCELLED));

    // SUBMITTED transitions
    matrix.add(
        new MatrixEntry(STATE_SUBMITTED, EVENT_HOLD, ministryStaffAndAdmin, ctx -> STATE_HOLD));
    matrix.add(
        new MatrixEntry(
            STATE_SUBMITTED,
            EVENT_APPROVE,
            ministryStaffAndAdmin,
            ctx -> STATE_SUBMISSION_APPROVED));
    matrix.add(
        new MatrixEntry(
            STATE_SUBMITTED, EVENT_REJECT, ministryStaffAndAdmin, ctx -> STATE_REJECTED));
    matrix.add(
        new MatrixEntry(STATE_SUBMITTED, EVENT_CANCEL, submitterAndAdmin, ctx -> STATE_CANCELLED));

    // HOLD transitions
    matrix.add(
        new MatrixEntry(
            STATE_HOLD, EVENT_APPROVE, ministryStaffAndAdmin, ctx -> STATE_SUBMISSION_APPROVED));
    matrix.add(
        new MatrixEntry(STATE_HOLD, EVENT_REJECT, ministryStaffAndAdmin, ctx -> STATE_REJECTED));
    matrix.add(
        new MatrixEntry(STATE_HOLD, EVENT_UNHOLD, ministryStaffAndAdmin, ctx -> STATE_SUBMITTED));

    // REJECTED transitions
    matrix.add(new MatrixEntry(STATE_REJECTED, EVENT_SUBMIT, submitterAndAdmin, submitResolver));
    matrix.add(
        new MatrixEntry(
            STATE_REJECTED, EVENT_CANCEL, submitterAndAdmin, ctx -> STATE_CANCELLED));

    // APPROVED / SUBMISSION_APPROVED transitions
    matrix.add(
        new MatrixEntry(
            STATE_SUBMISSION_APPROVED,
            EVENT_AUTO_APPROVE_BILLING,
            Set.of(Role.ADMIN),
            ctx -> STATE_BILLING_APPROVED));
    matrix.add(
        new MatrixEntry(
            STATE_SUBMISSION_APPROVED,
            EVENT_APPROVE_BILLING,
            ministryStaffAndAdmin,
            ctx -> STATE_BILLING_APPROVED));
    matrix.add(
        new MatrixEntry(
            STATE_APPROVED,
            EVENT_AUTO_APPROVE_BILLING,
            Set.of(Role.ADMIN),
            ctx -> STATE_BILLING_APPROVED));
    matrix.add(
        new MatrixEntry(
            STATE_APPROVED,
            EVENT_APPROVE_BILLING,
            ministryStaffAndAdmin,
            ctx -> STATE_BILLING_APPROVED));

    return matrix;
  }

  /**
   * Evaluates whether a requested lifecycle transition is permitted.
   *
   * @param currentState current lifecycle state; defaults to DRAFT if null or blank
   * @param event transition event requested; must not be null
   * @param role user role performing the transition
   * @param provider identity provider of the authenticated user
   * @param context contextual attributes such as PLC date and requirement responses
   * @return evaluation result indicating whether the transition is allowed and the target state
   */
  public TransitionEvaluationResult evaluate(
      String currentState,
      String event,
      Role role,
      IdentityProvider provider,
      TransitionContext context) {

    if (event == null || event.isBlank()) {
      return TransitionEvaluationResult.denied("Transition event must not be blank.");
    }

    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String normalizedCurrentState =
        (currentState == null || currentState.isBlank())
            ? STATE_DRAFT
            : currentState.trim().toUpperCase(Locale.ROOT);

    // Rule 4: Viewer role is read-only in every state;
    // Submitter may only edit while DRAFT or REJECTED
    if (role == null || role == Role.VIEWER) {
      log.debug("Transition denied: viewer role is read-only.");
      return TransitionEvaluationResult.forbidden("Viewer role is read-only in every state.");
    }

    // BCeID users cannot perform internal IDIR roles
    if (provider == IdentityProvider.BUSINESS_BCEID
        && (role == Role.ADMIN || role == Role.AREA || role == Role.DISTRICT)) {
      log.warn("Transition denied: BCeID caller claimed internal role {}", role);
      return TransitionEvaluationResult.forbidden(
          "BCeID callers cannot exercise administrative or ministry roles.");
    }

    // Match candidate entries in the matrix
    List<MatrixEntry> matchingEventAndState =
        transitionMatrix.stream()
            .filter(entry -> entry.fromState().equalsIgnoreCase(normalizedCurrentState))
            .filter(entry -> entry.event().equalsIgnoreCase(normalizedEvent))
            .toList();

    if (matchingEventAndState.isEmpty()) {
      log.debug(
          "Transition denied: no matrix edge from state '{}' on event '{}'",
          normalizedCurrentState,
          normalizedEvent);
      return TransitionEvaluationResult.denied(
          String.format(
              "Illegal transition: event '%s' is not permitted from state '%s'.",
              normalizedEvent, normalizedCurrentState));
    }

    // Check role permission
    MatrixEntry matchedEntry =
        matchingEventAndState.stream()
            .filter(entry -> entry.allowedRoles().contains(role))
            .findFirst()
            .orElse(null);

    if (matchedEntry == null) {
      log.debug(
          "Transition denied: role '{}' not permitted for event '{}' from state '{}'",
          role,
          normalizedEvent,
          normalizedCurrentState);
      return TransitionEvaluationResult.forbidden(
          String.format(
              "Role '%s' is not permitted to trigger event '%s' from state '%s'.",
              role, normalizedEvent, normalizedCurrentState));
    }

    String targetState = matchedEntry.targetStateResolver().apply(context);
    log.info(
        "Transition allowed: {} -> {} via {} by role {}",
        normalizedCurrentState,
        targetState,
        normalizedEvent,
        role);
    return TransitionEvaluationResult.allowed(targetState);
  }

  /**
   * Checks whether the conditions to hold a block transition are met.
   *
   * <p>Hold conditions per Issue #1231:
   * <ul>
   *   <li>Submission date is later than PLC date + 12 months (strictly after)</li>
   *   <li>Rationale required is answered affirmative</li>
   *   <li>Burnt piles question is answered affirmative</li>
   * </ul>
   *
   * @param context transition context
   * @return true if hold conditions are met, false otherwise
   */
  public boolean isHoldConditionMet(TransitionContext context) {
    if (context == null) {
      return false;
    }
    if (context.rationaleRequired() || context.burntPiles()) {
      return true;
    }
    if (context.plcDate() != null) {
      LocalDate effectiveDate =
          context.submissionDate() != null
              ? context.submissionDate()
              : LocalDate.now(ZoneOffset.UTC);
      LocalDate holdThreshold = context.plcDate().plusMonths(DEFAULT_AUTO_APPROVE_MONTHS);
      return effectiveDate.isAfter(holdThreshold);
    }
    return false;
  }
}
