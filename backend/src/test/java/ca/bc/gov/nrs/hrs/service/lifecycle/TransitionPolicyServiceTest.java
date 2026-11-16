package ca.bc.gov.nrs.hrs.service.lifecycle;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("Unit Test | Transition Policy Service")
class TransitionPolicyServiceTest {

  private TransitionPolicyService transitionPolicyService;

  @BeforeEach
  void setUp() {
    transitionPolicyService = new TransitionPolicyService();
  }

  @Nested
  @DisplayName("Draft State Transitions")
  class DraftStateTransitions {

    @Test
    @DisplayName("SUBMIT by SUBMITTER without hold conditions transitions to SUBMITTED")
    void submit_bySubmitter_transitionsToSubmitted() {
      TransitionContext context = TransitionContext.empty();
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              context);

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_SUBMITTED);
      assertThat(result.reason()).isNull();
    }

    @Test
    @DisplayName("SUBMIT by ADMIN without hold conditions transitions to SUBMITTED")
    void submit_byAdmin_transitionsToSubmitted() {
      TransitionContext context = TransitionContext.empty();
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.ADMIN,
              IdentityProvider.IDIR,
              context);

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_SUBMITTED);
    }

    @Test
    @DisplayName("CANCEL by SUBMITTER transitions to CANCELLED")
    void cancel_bySubmitter_transitionsToCancelled() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_CANCEL,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_CANCELLED);
    }

    @Test
    @DisplayName("APPROVE from DRAFT is illegal and returns denied")
    void approve_fromDraft_isDenied() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_APPROVE,
              Role.ADMIN,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.reason()).contains("Illegal transition");
    }

    @Test
    @DisplayName("REJECT from DRAFT is illegal and returns denied")
    void reject_fromDraft_isDenied() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_REJECT,
              Role.ADMIN,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.reason()).contains("Illegal transition");
    }
  }

  @Nested
  @DisplayName("Hold Rule Boundary Conditions (Issue #1231)")
  class HoldRuleBoundaryConditions {

    private final LocalDate plcDate = LocalDate.of(2025, 6, 15);

    @Test
    @DisplayName("Submission at PLC + 12mo - 1 day passes to SUBMITTED")
    void submit_plcPlus12MoMinusOneDay_passesToSubmitted() {
      LocalDate submissionDate = plcDate.plusMonths(12).minusDays(1);
      TransitionContext context = new TransitionContext(plcDate, submissionDate, false, false);

      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              context);

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_SUBMITTED);
    }

    @Test
    @DisplayName("Submission at exact PLC + 12mo boundary passes to SUBMITTED")
    void submit_exactPlcPlus12Mo_passesToSubmitted() {
      LocalDate submissionDate = plcDate.plusMonths(12);
      TransitionContext context = new TransitionContext(plcDate, submissionDate, false, false);

      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              context);

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_SUBMITTED);
    }

    @Test
    @DisplayName("Submission at PLC + 12mo + 1 day holds and transitions to HOLD")
    void submit_plcPlus12MoPlusOneDay_holds() {
      LocalDate submissionDate = plcDate.plusMonths(12).plusDays(1);
      TransitionContext context = new TransitionContext(plcDate, submissionDate, false, false);

      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              context);

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_HOLD);
    }

    @Test
    @DisplayName("Submission with RATIONALE_REQUIRED answered yes transitions to HOLD")
    void submit_withRationaleRequired_holds() {
      TransitionContext context =
          new TransitionContext(plcDate, plcDate.plusMonths(1), true, false);

      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              context);

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_HOLD);
    }

    @Test
    @DisplayName("Submission with BURNT_PILES answered yes transitions to HOLD")
    void submit_withBurntPiles_holds() {
      TransitionContext context =
          new TransitionContext(plcDate, plcDate.plusMonths(1), false, true);

      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              context);

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_HOLD);
    }
  }

  @Nested
  @DisplayName("Submitted and Hold State Transitions")
  class SubmittedAndHoldTransitions {

    @ParameterizedTest
    @ValueSource(strings = {"AREA", "DISTRICT", "ADMIN"})
    @DisplayName("APPROVE from SUBMITTED transitions to SUBMISSION_APPROVED")
    void approve_fromSubmitted_transitionsToSubmissionApproved(String roleName) {
      Role role = Role.valueOf(roleName);
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.EVENT_APPROVE,
              role,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState())
          .isEqualTo(TransitionPolicyService.STATE_SUBMISSION_APPROVED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"AREA", "DISTRICT", "ADMIN"})
    @DisplayName("REJECT from SUBMITTED transitions to REJECTED")
    void reject_fromSubmitted_transitionsToRejected(String roleName) {
      Role role = Role.valueOf(roleName);
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.EVENT_REJECT,
              role,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_REJECTED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"AREA", "DISTRICT", "ADMIN"})
    @DisplayName("HOLD from SUBMITTED transitions to HOLD")
    void hold_fromSubmitted_transitionsToHold(String roleName) {
      Role role = Role.valueOf(roleName);
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.EVENT_HOLD,
              role,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_HOLD);
    }

    @Test
    @DisplayName("UNHOLD from HOLD transitions back to SUBMITTED")
    void unhold_fromHold_transitionsToSubmitted() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_HOLD,
              TransitionPolicyService.EVENT_UNHOLD,
              Role.DISTRICT,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_SUBMITTED);
    }

    @Test
    @DisplayName("SUBMIT while already SUBMITTED is illegal")
    void submit_fromSubmitted_isDenied() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.reason()).contains("Illegal transition");
    }

    @Test
    @DisplayName("SUBMIT from REJECTED transitions to SUBMITTED")
    void submit_fromRejected_transitionsToSubmitted() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_REJECTED,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_SUBMITTED);
    }
  }

  @Nested
  @DisplayName("Role and Security Fail-Closed Invariants")
  class RoleAndSecurityInvariants {

    @Test
    @DisplayName("VIEWER role is read-only in every state")
    void viewer_isDeniedEverywhere() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.EVENT_SUBMIT,
              Role.VIEWER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.reason()).contains("read-only");
    }

    @Test
    @DisplayName("BCeID caller claiming internal ADMIN role is denied")
    void bceid_claimingAdmin_isDenied() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.EVENT_APPROVE,
              Role.ADMIN,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.reason()).contains("BCeID callers cannot exercise");
    }

    @Test
    @DisplayName("Unknown event fails closed")
    void unknownEvent_failsClosed() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              "NON_EXISTENT_EVENT",
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.reason()).contains("Illegal transition");
    }

    @Test
    @DisplayName("Blank event fails closed")
    void blankEvent_failsClosed() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_DRAFT,
              "   ",
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.reason()).contains("must not be blank");
    }
  }
}
