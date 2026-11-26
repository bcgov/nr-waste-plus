package ca.bc.gov.nrs.hrs.service.lifecycle;

import ca.bc.gov.nrs.hrs.configuration.LifecyclePolicyProperties;
import ca.bc.gov.nrs.hrs.configuration.LifecyclePolicyProperties.ActorType;
import ca.bc.gov.nrs.hrs.configuration.LifecyclePolicyProperties.TransitionRule;
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
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Data-driven policy engine enforcing lifecycle state transitions and edit permissions for blocks
 * and reporting units.
 *
 * <p>All transition edges and per-role edit permissions are loaded from {@link
 * LifecyclePolicyProperties} (bound from {@code lifecycle-matrix.yml}) and timer thresholds from
 * {@link LifecycleSettingService}. Unknown states, roles, or events fail closed.
 */
@Service
@Slf4j
public class TransitionPolicyService {

  public static final int DEFAULT_AUTO_APPROVE_MONTHS = 12;
  public static final int DEFAULT_BILLING_DELAY_MONTHS = 1;

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
  public static final String EVENT_AUTO_APPROVE = "AUTO_APPROVE";
  public static final String EVENT_REJECT = "REJECT";
  public static final String EVENT_CANCEL = "CANCEL";
  public static final String EVENT_AUTO_APPROVE_BILLING = "AUTO_APPROVE_BILLING";
  public static final String EVENT_APPROVE_BILLING = "APPROVE_FOR_BILLING";
  public static final String EVENT_CONFIRM_BILLED = "CONFIRM_BILLED";
  public static final String EVENT_RETURN_TO_APPROVED = "RETURN_TO_APPROVED";
  public static final String EVENT_HBS_OUTCOME_INDETERMINATE = "HBS_OUTCOME_INDETERMINATE";

  public static final String CONDITION_NONE = "NONE";
  public static final String CONDITION_NO_HOLD = "NO_HOLD";
  public static final String CONDITION_HOLD_REQUIRED = "HOLD_REQUIRED";
  public static final String CONDITION_AUTO_APPROVE_ELAPSED = "AUTO_APPROVE_ELAPSED";
  public static final String CONDITION_BILLING_DELAY_ELAPSED = "BILLING_DELAY_ELAPSED";

  private final List<TransitionRule> transitionMatrix;
  private final Map<Role, Set<String>> editableStates;
  private final LifecycleSettingService lifecycleSettingService;

  /** Constructs the policy engine from configuration properties and lifecycle settings. */
  public TransitionPolicyService(
      LifecyclePolicyProperties properties, LifecycleSettingService lifecycleSettingService) {
    this.transitionMatrix =
        properties != null && properties.getTransitions() != null
            ? List.copyOf(properties.getTransitions())
            : List.of();
    this.editableStates =
        properties != null && properties.getEditableStates() != null
            ? Map.copyOf(properties.getEditableStates())
            : Map.of();
    this.lifecycleSettingService = lifecycleSettingService;
  }

  /**
   * Evaluates whether a requested user lifecycle transition is permitted (without checking comment
   * presence).
   */
  public TransitionEvaluationResult evaluate(
      String currentState,
      String event,
      Role role,
      IdentityProvider provider,
      TransitionContext context) {
    return evaluateInternal(currentState, event, role, provider, context, null, false);
  }

  /**
   * Evaluates whether a requested user lifecycle transition is permitted, including comment
   * requirement validation.
   */
  public TransitionEvaluationResult evaluate(
      String currentState,
      String event,
      Role role,
      IdentityProvider provider,
      TransitionContext context,
      String comment) {
    return evaluateInternal(currentState, event, role, provider, context, comment, true);
  }

  /**
   * Evaluates whether a scheduled {@code SYSTEM} actor transition is permitted from the given
   * state.
   */
  public TransitionEvaluationResult evaluateAsSystem(
      String currentState, String event, TransitionContext context) {
    if (event == null || event.isBlank()) {
      return TransitionEvaluationResult.denied("Transition event must not be blank.");
    }

    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String normalizedCurrentState = normalizeState(currentState);

    List<TransitionRule> matchingRules =
        transitionMatrix.stream()
            .filter(rule -> rule.actor() == ActorType.SYSTEM)
            .filter(rule -> rule.fromState().equalsIgnoreCase(normalizedCurrentState))
            .filter(rule -> rule.event().equalsIgnoreCase(normalizedEvent))
            .toList();

    if (matchingRules.isEmpty()) {
      return TransitionEvaluationResult.denied(
          String.format(
              "Illegal transition: system event '%s' is not permitted from state '%s'.",
              normalizedEvent, normalizedCurrentState));
    }

    TransitionRule matchedRule =
        matchingRules.stream()
            .filter(rule -> matchesCondition(rule, context))
            .findFirst()
            .orElse(null);

    if (matchedRule == null) {
      return TransitionEvaluationResult.preconditionFailed(
          String.format(
              "Precondition not met for system event '%s' from state '%s'.",
              normalizedEvent, normalizedCurrentState));
    }

    log.info(
        "System transition allowed: {} -> {} via {}",
        normalizedCurrentState,
        matchedRule.toState(),
        normalizedEvent);
    return TransitionEvaluationResult.allowed(matchedRule.toState(), matchedRule.externalStep());
  }

  private TransitionEvaluationResult evaluateInternal(
      String currentState,
      String event,
      Role role,
      IdentityProvider provider,
      TransitionContext context,
      String comment,
      boolean validateComment) {

    if (event == null || event.isBlank()) {
      return TransitionEvaluationResult.denied("Transition event must not be blank.");
    }

    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String normalizedCurrentState = normalizeState(currentState);

    if (role == null || role == Role.VIEWER) {
      log.debug("Transition denied: viewer role is read-only.");
      return TransitionEvaluationResult.forbidden("Viewer role is read-only in every state.");
    }

    if (provider == IdentityProvider.BUSINESS_BCEID && isInternalRole(role)) {
      log.warn("Transition denied: BCeID caller claimed internal role {}", role);
      return TransitionEvaluationResult.forbidden(
          "BCeID callers cannot exercise administrative or ministry roles.");
    }

    List<TransitionRule> matchingEventAndState =
        transitionMatrix.stream()
            .filter(rule -> rule.actor() == ActorType.USER)
            .filter(rule -> rule.fromState().equalsIgnoreCase(normalizedCurrentState))
            .filter(rule -> rule.event().equalsIgnoreCase(normalizedEvent))
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

    List<TransitionRule> roleMatchedRules =
        matchingEventAndState.stream()
            .filter(rule -> rule.roles() != null && rule.roles().contains(role))
            .toList();

    if (roleMatchedRules.isEmpty()) {
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

    TransitionRule matchedRule =
        roleMatchedRules.stream()
            .filter(rule -> matchesCondition(rule, context))
            .findFirst()
            .orElse(null);

    if (matchedRule == null) {
      log.debug(
          "Transition denied: precondition not met for event '{}' from state '{}'",
          normalizedEvent,
          normalizedCurrentState);
      return TransitionEvaluationResult.preconditionFailed(
          String.format(
              "Precondition not met for event '%s' from state '%s'.",
              normalizedEvent, normalizedCurrentState));
    }

    if (validateComment
        && matchedRule.commentRequired()
        && (comment == null || comment.isBlank())) {
      return TransitionEvaluationResult.commentRequired(
          String.format("A comment is required for event '%s'.", normalizedEvent));
    }

    log.info(
        "Transition allowed: {} -> {} via {} by role {}",
        normalizedCurrentState,
        matchedRule.toState(),
        normalizedEvent,
        role);
    return TransitionEvaluationResult.allowed(matchedRule.toState(), matchedRule.externalStep());
  }

  /**
   * Evaluates whether a caller with the given role and identity provider may edit data in the
   * specified state.
   */
  public TransitionEvaluationResult canEdit(
      String currentState, Role role, IdentityProvider provider) {
    if (role == null || role == Role.VIEWER) {
      return TransitionEvaluationResult.forbidden("Viewer role is read-only in every state.");
    }
    if (provider == IdentityProvider.BUSINESS_BCEID && isInternalRole(role)) {
      return TransitionEvaluationResult.forbidden(
          "BCeID callers cannot exercise administrative or ministry roles.");
    }
    String normalizedState = normalizeState(currentState);
    Set<String> allowedStates = editableStates.get(role);
    if (allowedStates == null
        || allowedStates.stream().noneMatch(s -> s.equalsIgnoreCase(normalizedState))) {
      return TransitionEvaluationResult.stateNotEditable(
          String.format("Role '%s' cannot edit in state '%s'.", role, normalizedState));
    }
    return TransitionEvaluationResult.editAllowed();
  }

  /** Checks whether the given event name exists in the transition matrix. */
  public boolean isKnownEvent(String event) {
    if (event == null || event.isBlank()) {
      return false;
    }
    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    return transitionMatrix.stream()
        .anyMatch(rule -> rule.event().equalsIgnoreCase(normalizedEvent));
  }

  /** Checks whether an event from the given state is marked as {@code SYSTEM}-only. */
  public boolean isSystemOnly(String currentState, String event) {
    if (event == null || event.isBlank()) {
      return false;
    }
    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String normalizedCurrentState = normalizeState(currentState);
    List<TransitionRule> matching =
        transitionMatrix.stream()
            .filter(rule -> rule.fromState().equalsIgnoreCase(normalizedCurrentState))
            .filter(rule -> rule.event().equalsIgnoreCase(normalizedEvent))
            .toList();
    return !matching.isEmpty()
        && matching.stream().allMatch(rule -> rule.actor() == ActorType.SYSTEM);
  }

  /** Checks whether a comment is mandatory for a given event from the current state. */
  public boolean isCommentRequired(String currentState, String event) {
    if (event == null || event.isBlank()) {
      return false;
    }
    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String normalizedCurrentState = normalizeState(currentState);

    return transitionMatrix.stream()
        .filter(rule -> rule.fromState().equalsIgnoreCase(normalizedCurrentState))
        .filter(rule -> rule.event().equalsIgnoreCase(normalizedEvent))
        .anyMatch(TransitionRule::commentRequired);
  }

  /**
   * Computes the list of user events available to the caller from the specified lifecycle state.
   * Applies the exact same matrix rules and conditions as {@link #evaluate}.
   */
  public List<AvailableLifecycleEventDto> availableEvents(
      String currentState,
      Role role,
      IdentityProvider provider,
      TransitionContext context) {

    if (role == null || role == Role.VIEWER) {
      return Collections.emptyList();
    }
    if (provider == IdentityProvider.BUSINESS_BCEID && isInternalRole(role)) {
      return Collections.emptyList();
    }

    String normalizedCurrentState = normalizeState(currentState);
    Set<String> seenEvents = new HashSet<>();
    List<AvailableLifecycleEventDto> result = new ArrayList<>();

    for (TransitionRule rule : transitionMatrix) {
      if (rule.actor() != ActorType.USER) {
        continue;
      }
      if (!rule.fromState().equalsIgnoreCase(normalizedCurrentState)) {
        continue;
      }
      if (rule.roles() == null || !rule.roles().contains(role)) {
        continue;
      }
      if (!matchesCondition(rule, context)) {
        continue;
      }
      if (seenEvents.add(rule.event().toUpperCase(Locale.ROOT))) {
        result.add(
            new AvailableLifecycleEventDto(
                rule.event(),
                rule.label(),
                rule.commentRequired(),
                rule.confirmationRequired()));
      }
    }

    return Collections.unmodifiableList(result);
  }

  /**
   * Checks whether the configured {@code AUTO_APPROVE_MONTHS} has elapsed from the block's
   * submission date.
   */
  public boolean isAutoApproveEligible(TransitionContext context) {
    return isAutoApproveEligible(context, LocalDate.now(ZoneOffset.UTC));
  }

  /** Package-private / testable overload accepting an explicit evaluation date. */
  boolean isAutoApproveEligible(TransitionContext context, LocalDate asOfDate) {
    if (context == null || context.submissionDate() == null || asOfDate == null) {
      return false;
    }
    int months =
        lifecycleSettingService != null
            ? lifecycleSettingService.getAutoApproveMonths()
            : DEFAULT_AUTO_APPROVE_MONTHS;
    return !asOfDate.isBefore(context.submissionDate().plusMonths(months));
  }

  /**
   * Checks whether the configured {@code BILLING_DELAY_MONTHS} has elapsed from the block's
   * approval date (falling back to submission date if approval date is absent).
   */
  public boolean isAutoApproveBillingEligible(TransitionContext context) {
    return isAutoApproveBillingEligible(context, LocalDate.now(ZoneOffset.UTC));
  }

  /** Package-private / testable overload accepting an explicit evaluation date. */
  boolean isAutoApproveBillingEligible(TransitionContext context, LocalDate asOfDate) {
    if (context == null || asOfDate == null) {
      return false;
    }
    LocalDate referenceDate =
        context.approvedDate() != null ? context.approvedDate() : context.submissionDate();
    if (referenceDate == null) {
      return false;
    }
    int months =
        lifecycleSettingService != null
            ? lifecycleSettingService.getBillingDelayMonths()
            : DEFAULT_BILLING_DELAY_MONTHS;
    return !asOfDate.isBefore(referenceDate.plusMonths(months));
  }

  /**
   * Checks whether the conditions to hold a block transition are met:
   * submission date strictly after PLC date + 12 months, or {@code RATIONALE_REQUIRED}/{@code
   * BURNT_PILES} answered yes.
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

  private boolean matchesCondition(TransitionRule rule, TransitionContext context) {
    String condition = rule.condition();
    if (condition == null || condition.isBlank() || CONDITION_NONE.equalsIgnoreCase(condition)) {
      return true;
    }
    return switch (condition.trim().toUpperCase(Locale.ROOT)) {
      case CONDITION_NO_HOLD -> !isHoldConditionMet(context);
      case CONDITION_HOLD_REQUIRED -> isHoldConditionMet(context);
      case CONDITION_AUTO_APPROVE_ELAPSED -> isAutoApproveEligible(context);
      case CONDITION_BILLING_DELAY_ELAPSED -> isAutoApproveBillingEligible(context);
      default -> {
        log.warn("Unknown transition condition '{}'; failing closed.", condition);
        yield false;
      }
    };
  }

  private String normalizeState(String currentState) {
    return (currentState == null || currentState.isBlank())
        ? STATE_DRAFT
        : currentState.trim().toUpperCase(Locale.ROOT);
  }

  private boolean isInternalRole(Role role) {
    return role == Role.ADMIN || role == Role.AREA || role == Role.DISTRICT;
  }
}
