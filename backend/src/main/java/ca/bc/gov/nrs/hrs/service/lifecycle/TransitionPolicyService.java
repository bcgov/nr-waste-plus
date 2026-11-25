package ca.bc.gov.nrs.hrs.service.lifecycle;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.AvailableLifecycleEventDto;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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
  public static final String STATE_PLANNING = "PLANNING";
  public static final String STATE_SUBMISSION = "SUBMISSION";
  public static final String STATE_SUBMITTED = "SUBMITTED";
  public static final String STATE_HOLD = "HOLD";
  public static final String STATE_SUBMISSION_APPROVED = "SUBMISSION_APPROVED";
  public static final String STATE_APPROVED = "APPROVED";
  public static final String STATE_STAFF_REVIEW = "STAFF_REVIEW";
  public static final String STATE_REJECTED = "REJECTED";
  public static final String STATE_CANCELLED = "CANCELLED";
  public static final String STATE_BILLING_APPROVED = "BILLING_APPROVED";
  public static final String STATE_ERROR = "ERROR";
  public static final String STATE_CLOSED = "CLOSED";

  public static final String EVENT_SUBMIT = "SUBMIT";
  public static final String EVENT_HOLD = "HOLD";
  public static final String EVENT_UNHOLD = "UNHOLD";
  public static final String EVENT_APPROVE = "APPROVE";
  public static final String EVENT_REJECT = "REJECT";
  public static final String EVENT_CANCEL = "CANCEL";
  public static final String EVENT_AUTO_APPROVE_BILLING = "AUTO_APPROVE_BILLING";
  public static final String EVENT_APPROVE_BILLING = "APPROVE_BILLING";
  public static final String EVENT_CONFIRM_BILLED = "CONFIRM_BILLED";
  public static final String EVENT_RETURN_TO_APPROVED = "RETURN_TO_APPROVED";

  /**
   * Internal transition matrix entry defining the conditions under which an event may fire.
   */
  public record MatrixEntry(
      String fromState,
      String event,
      String label,
      Set<Role> allowedRoles,
      boolean commentRequired,
      boolean confirmationRequired,
      boolean isSystemOnly,
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
    matrix.add(
        new MatrixEntry(
            STATE_DRAFT, EVENT_SUBMIT, "Submit", submitterAndAdmin, false, false, false,
            submitResolver));
    matrix.add(
        new MatrixEntry(
            STATE_DRAFT, EVENT_CANCEL, "Cancel", submitterAndAdmin, true, true, false,
            ctx -> STATE_CANCELLED));

    // PLANNING (reporting-unit initial state)
    matrix.add(
        new MatrixEntry(
            STATE_PLANNING, EVENT_SUBMIT, "Submit", submitterAndAdmin, false, false, false,
            ctx -> STATE_STAFF_REVIEW));

    // SUBMISSION (reporting-unit state)
    matrix.add(
        new MatrixEntry(
            STATE_SUBMISSION, EVENT_SUBMIT, "Submit", submitterAndAdmin, false, false, false,
            submitResolver));
    matrix.add(
        new MatrixEntry(
            STATE_SUBMISSION, EVENT_CANCEL, "Cancel", submitterAndAdmin, true, true, false,
            ctx -> STATE_CANCELLED));

    // SUBMITTED transitions
    matrix.add(
        new MatrixEntry(
            STATE_SUBMITTED, EVENT_HOLD, "Place on hold", ministryStaffAndAdmin, false, true, false,
            ctx -> STATE_HOLD));
    matrix.add(
        new MatrixEntry(
            STATE_SUBMITTED, EVENT_APPROVE, "Approve submission", ministryStaffAndAdmin, false,
            true, false, ctx -> STATE_SUBMISSION_APPROVED));
    matrix.add(
        new MatrixEntry(
            STATE_SUBMITTED, EVENT_REJECT, "Reject submission", ministryStaffAndAdmin, true, true,
            false, ctx -> STATE_REJECTED));
    matrix.add(
        new MatrixEntry(
            STATE_SUBMITTED, EVENT_CANCEL, "Cancel", submitterAndAdmin, true, true, false,
            ctx -> STATE_CANCELLED));

    // STAFF_REVIEW (reporting-unit review state)
    matrix.add(
        new MatrixEntry(
            STATE_STAFF_REVIEW, EVENT_APPROVE, "Approve submission", ministryStaffAndAdmin, false,
            true, false, ctx -> STATE_CLOSED));
    matrix.add(
        new MatrixEntry(
            STATE_STAFF_REVIEW, EVENT_REJECT, "Reject submission", ministryStaffAndAdmin, true,
            true, false, ctx -> STATE_SUBMISSION));

    // HOLD transitions
    matrix.add(
        new MatrixEntry(
            STATE_HOLD, EVENT_APPROVE, "Approve submission", ministryStaffAndAdmin, false, true,
            false, ctx -> STATE_SUBMISSION_APPROVED));
    matrix.add(
        new MatrixEntry(
            STATE_HOLD, EVENT_REJECT, "Reject submission", ministryStaffAndAdmin, true, true,
            false, ctx -> STATE_REJECTED));
    matrix.add(
        new MatrixEntry(
            STATE_HOLD, EVENT_UNHOLD, "Release hold", ministryStaffAndAdmin, false, true, false,
            ctx -> STATE_SUBMITTED));

    // REJECTED transitions
    matrix.add(
        new MatrixEntry(
            STATE_REJECTED, EVENT_SUBMIT, "Submit", submitterAndAdmin, false, false, false,
            submitResolver));
    matrix.add(
        new MatrixEntry(
            STATE_REJECTED, EVENT_CANCEL, "Cancel", submitterAndAdmin, true, true, false,
            ctx -> STATE_CANCELLED));

    // Billing transitions (APPROVE_BILLING, AUTO_APPROVE_BILLING) are deferred until
    // HBS invoice integration (#1552) lands.

    // ERROR resolution transitions
    matrix.add(
        new MatrixEntry(
            STATE_ERROR, EVENT_CONFIRM_BILLED, "Confirm billed", Set.of(Role.ADMIN), false, true,
            false, ctx -> STATE_BILLING_APPROVED));
    matrix.add(
        new MatrixEntry(
            STATE_ERROR, EVENT_RETURN_TO_APPROVED, "Return to approved", Set.of(Role.ADMIN), false,
            true, false, ctx -> STATE_SUBMISSION_APPROVED));

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
    if (targetState == null) {
      log.debug(
          "Transition denied: precondition not met for event '{}' from state '{}'",
          normalizedEvent,
          normalizedCurrentState);
      return TransitionEvaluationResult.denied(
          String.format(
              "Precondition not met for event '%s' from state '%s'.",
              normalizedEvent, normalizedCurrentState));
    }

    log.info(
        "Transition allowed: {} -> {} via {} by role {}",
        normalizedCurrentState,
        targetState,
        normalizedEvent,
        role);
    return TransitionEvaluationResult.allowed(targetState);
  }

  /**
   * Checks whether the given event name exists in the transition matrix.
   *
   * @param event transition event name
   * @return true if the event is defined in the transition matrix
   */
  public boolean isKnownEvent(String event) {
    if (event == null || event.isBlank()) {
      return false;
    }
    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    return transitionMatrix.stream().anyMatch(entry -> entry.event().equals(normalizedEvent));
  }

  /**
   * Checks whether an event from the given state is marked as system-only (cannot be triggered
   * directly via HTTP).
   *
   * @param currentState current lifecycle state
   * @param event transition event name
   * @return true if the matching transition is system-only
   */
  public boolean isSystemOnly(String currentState, String event) {
    if (event == null || event.isBlank()) {
      return false;
    }
    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String normalizedCurrentState =
        (currentState == null || currentState.isBlank())
            ? STATE_DRAFT
            : currentState.trim().toUpperCase(Locale.ROOT);
    return transitionMatrix.stream()
        .filter(entry -> entry.fromState().equalsIgnoreCase(normalizedCurrentState))
        .filter(entry -> entry.event().equalsIgnoreCase(normalizedEvent))
        .anyMatch(MatrixEntry::isSystemOnly);
  }

  /**
   * Checks whether a comment is mandatory for a given event from the current state.
   *
   * @param currentState current lifecycle state
   * @param event transition event name
   * @return true if the event requires a non-blank comment
   */
  public boolean isCommentRequired(String currentState, String event) {
    if (event == null || event.isBlank()) {
      return false;
    }
    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String normalizedCurrentState =
        (currentState == null || currentState.isBlank())
            ? STATE_DRAFT
            : currentState.trim().toUpperCase(Locale.ROOT);

    return transitionMatrix.stream()
        .filter(entry -> entry.fromState().equalsIgnoreCase(normalizedCurrentState))
        .filter(entry -> entry.event().equalsIgnoreCase(normalizedEvent))
        .anyMatch(MatrixEntry::commentRequired);
  }

  /**
   * Computes the list of events available to the caller from the specified lifecycle state.
   *
   * @param currentState current lifecycle state of the subject
   * @param role user role performing the query
   * @param provider identity provider of the authenticated user
   * @param context contextual attributes
   * @return list of available lifecycle event metadata
   */
  public List<AvailableLifecycleEventDto> availableEvents(
      String currentState,
      Role role,
      IdentityProvider provider,
      TransitionContext context) {

    if (role == null || role == Role.VIEWER) {
      return Collections.emptyList();
    }

    if (provider == IdentityProvider.BUSINESS_BCEID
        && (role == Role.ADMIN || role == Role.AREA || role == Role.DISTRICT)) {
      return Collections.emptyList();
    }

    String normalizedCurrentState =
        (currentState == null || currentState.isBlank())
            ? STATE_DRAFT
            : currentState.trim().toUpperCase(Locale.ROOT);

    Set<String> seenEvents = new HashSet<>();
    List<AvailableLifecycleEventDto> result = new ArrayList<>();

    for (MatrixEntry entry : transitionMatrix) {
      if (!entry.fromState().equalsIgnoreCase(normalizedCurrentState)) {
        continue;
      }
      if (entry.isSystemOnly()) {
        continue;
      }
      if (!entry.allowedRoles().contains(role)) {
        continue;
      }
      if (entry.targetStateResolver().apply(context) == null) {
        continue;
      }
      if (seenEvents.add(entry.event())) {
        result.add(
            new AvailableLifecycleEventDto(
                entry.event(),
                entry.label(),
                entry.commentRequired(),
                entry.confirmationRequired()));
      }
    }

    return Collections.unmodifiableList(result);
  }

  /**
   * Checks whether the 12-month elapsed time requirement from submission has been met
   * for system auto-approval of billing.
   *
   * @param context transition context carrying submission date
   * @return true if at least 12 months have elapsed since submission, false otherwise
   */
  public boolean isAutoApproveBillingEligible(TransitionContext context) {
    if (context == null || context.submissionDate() == null) {
      return false;
    }
    LocalDate now = LocalDate.now(ZoneOffset.UTC);
    return !now.isBefore(context.submissionDate().plusMonths(DEFAULT_AUTO_APPROVE_MONTHS));
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
