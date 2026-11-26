package ca.bc.gov.nrs.hrs.service.lifecycle;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.configuration.LifecyclePolicyProperties;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.AvailableLifecycleEventDto;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;
import org.springframework.core.io.ClassPathResource;

@DisplayName("Unit Test | Transition Policy Service")
class TransitionPolicyServiceTest {

  private LifecyclePolicyProperties policyProperties;
  private int autoApproveMonths = 12;
  private int billingDelayMonths = 1;
  private TransitionPolicyService transitionPolicyService;

  @BeforeEach
  void setUp() {
    YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
    yaml.setResources(new ClassPathResource("lifecycle-matrix.yml"));
    Properties props = yaml.getObject();
    policyProperties =
        new Binder(new MapConfigurationPropertySource(props))
            .bind("ca.bc.gov.nrs.lifecycle", LifecyclePolicyProperties.class)
            .get();

    LifecycleSettingService settingService =
        new LifecycleSettingService(null) {
          @Override
          public int getAutoApproveMonths() {
            return autoApproveMonths;
          }

          @Override
          public int getBillingDelayMonths() {
            return billingDelayMonths;
          }
        };

    transitionPolicyService = new TransitionPolicyService(policyProperties, settingService);
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
      assertThat(result.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.ILLEGAL_TRANSITION);
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
      assertThat(result.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.ILLEGAL_TRANSITION);
      assertThat(result.reason()).contains("Illegal transition");
    }
  }

  @Nested
  @DisplayName("Hold Rule Boundary Conditions (Issue #1231)")
  class HoldRuleBoundaryConditions {

    private final LocalDate plcDate = LocalDate.of(2025, Month.JUNE, 15);

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
      assertThat(result.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.ROLE_NOT_ALLOWED);
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
      assertThat(result.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.ROLE_NOT_ALLOWED);
      assertThat(result.reason()).contains("BCeID callers cannot exercise");
    }

    @Test
    @DisplayName("Role not permitted for event returns ROLE_NOT_ALLOWED denial")
    void roleNotPermitted_returnsForbiddenRole() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.EVENT_APPROVE,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(result.allowed()).isFalse();
      assertThat(result.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.ROLE_NOT_ALLOWED);
      assertThat(result.reason()).contains("is not permitted");
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

  @Nested
  @DisplayName("Available Events Computation")
  class AvailableEventsComputation {

    @Test
    @DisplayName("Submitter in DRAFT gets SUBMIT and CANCEL")
    void availableEvents_forSubmitterInDraft() {
      List<AvailableLifecycleEventDto> events =
          transitionPolicyService.availableEvents(
              TransitionPolicyService.STATE_DRAFT,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(events)
          .extracting(AvailableLifecycleEventDto::event)
          .containsExactlyInAnyOrder("SUBMIT", "CANCEL");

      AvailableLifecycleEventDto cancelEvent =
          events.stream().filter(e -> "CANCEL".equals(e.event())).findFirst().orElseThrow();
      assertThat(cancelEvent.commentRequired()).isTrue();
      assertThat(cancelEvent.confirmationRequired()).isTrue();
    }

    @Test
    @DisplayName("Ministry staff in SUBMITTED gets APPROVE, REJECT, and HOLD")
    void availableEvents_forAreaInSubmitted() {
      List<AvailableLifecycleEventDto> events =
          transitionPolicyService.availableEvents(
              TransitionPolicyService.STATE_SUBMITTED,
              Role.AREA,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(events)
          .extracting(AvailableLifecycleEventDto::event)
          .containsExactlyInAnyOrder("APPROVE", "REJECT", "HOLD");

      AvailableLifecycleEventDto rejectEvent =
          events.stream().filter(e -> "REJECT".equals(e.event())).findFirst().orElseThrow();
      assertThat(rejectEvent.commentRequired()).isTrue();
      assertThat(rejectEvent.confirmationRequired()).isTrue();
    }

    @Test
    @DisplayName("Viewer gets empty list in every state")
    void availableEvents_forViewer_returnsEmpty() {
      List<AvailableLifecycleEventDto> events =
          transitionPolicyService.availableEvents(
              TransitionPolicyService.STATE_SUBMITTED,
              Role.VIEWER,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(events).isEmpty();
    }

    @Test
    @DisplayName("BCeID caller claiming internal role gets empty list")
    void availableEvents_forBceidClaimingAdmin_returnsEmpty() {
      List<AvailableLifecycleEventDto> events =
          transitionPolicyService.availableEvents(
              TransitionPolicyService.STATE_SUBMITTED,
              Role.ADMIN,
              IdentityProvider.BUSINESS_BCEID,
              TransitionContext.empty());

      assertThat(events).isEmpty();
    }
  }

  @Nested
  @DisplayName("Comment Requirement Rules")
  class CommentRequirementRules {

    @Test
    @DisplayName("isCommentRequired returns true for REJECT and CANCEL")
    void isCommentRequired_trueCases() {
      assertThat(
              transitionPolicyService.isCommentRequired(
                  TransitionPolicyService.STATE_SUBMITTED, "REJECT"))
          .isTrue();
      assertThat(
              transitionPolicyService.isCommentRequired(
                  TransitionPolicyService.STATE_DRAFT, "CANCEL"))
          .isTrue();
    }

    @Test
    @DisplayName("isCommentRequired returns false for SUBMIT and APPROVE")
    void isCommentRequired_falseCases() {
      assertThat(
              transitionPolicyService.isCommentRequired(
                  TransitionPolicyService.STATE_DRAFT, "SUBMIT"))
          .isFalse();
      assertThat(
              transitionPolicyService.isCommentRequired(
                  TransitionPolicyService.STATE_SUBMITTED, "APPROVE"))
          .isFalse();
    }

    @Test
    @DisplayName("evaluate with blank comment returns COMMENT_REQUIRED for REJECT")
    void evaluate_blankCommentForReject_returnsCommentRequired() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.EVENT_REJECT,
              Role.AREA,
              IdentityProvider.IDIR,
              TransitionContext.empty(),
              "   ");

      assertThat(result.allowed()).isFalse();
      assertThat(result.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.COMMENT_REQUIRED);
    }
  }

  @Nested
  @DisplayName("Billing, ERROR, and External Steps (Issue #1231)")
  class BillingAndErrorTransitions {

    @Test
    @DisplayName("APPROVE_FOR_BILLING returns HBS_INVOICE_POST externalStep")
    void approveForBilling_returnsExternalStep() {
      TransitionEvaluationResult result =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_SUBMISSION_APPROVED,
              TransitionPolicyService.EVENT_APPROVE_BILLING,
              Role.DISTRICT,
              IdentityProvider.IDIR,
              TransitionContext.empty());

      assertThat(result.allowed()).isTrue();
      assertThat(result.targetState()).isEqualTo(TransitionPolicyService.STATE_BILLING_APPROVED);
      assertThat(result.externalStep()).isEqualTo("HBS_INVOICE_POST");
    }

    @Test
    @DisplayName("Only ADMIN can resolve ERROR state")
    void errorResolution_adminOnly() {
      TransitionEvaluationResult areaDenied =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_ERROR,
              TransitionPolicyService.EVENT_CONFIRM_BILLED,
              Role.AREA,
              IdentityProvider.IDIR,
              TransitionContext.empty());
      assertThat(areaDenied.allowed()).isFalse();
      assertThat(areaDenied.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.ROLE_NOT_ALLOWED);

      TransitionEvaluationResult adminConfirmed =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_ERROR,
              TransitionPolicyService.EVENT_CONFIRM_BILLED,
              Role.ADMIN,
              IdentityProvider.IDIR,
              TransitionContext.empty());
      assertThat(adminConfirmed.allowed()).isTrue();
      assertThat(adminConfirmed.targetState())
          .isEqualTo(TransitionPolicyService.STATE_BILLING_APPROVED);
      assertThat(adminConfirmed.externalStep()).isEqualTo("HBS_INVOICE_LOOKUP");

      TransitionEvaluationResult adminReturned =
          transitionPolicyService.evaluate(
              TransitionPolicyService.STATE_ERROR,
              TransitionPolicyService.EVENT_RETURN_TO_APPROVED,
              Role.ADMIN,
              IdentityProvider.IDIR,
              TransitionContext.empty());
      assertThat(adminReturned.allowed()).isTrue();
      assertThat(adminReturned.targetState())
          .isEqualTo(TransitionPolicyService.STATE_SUBMISSION_APPROVED);
    }
  }

  @Nested
  @DisplayName("Timer Boundaries and Dynamic Settings (Issue #1231)")
  class TimerBoundaries {

    @Test
    @DisplayName("AUTO_APPROVE fires at configured month boundary and not before")
    void autoApprove_respectsConfiguredMonthBoundary() {
      // Fixed leap-day submission: 2024-02-29 + 12 months = 2025-02-28
      LocalDate submissionDate = LocalDate.of(2024, Month.FEBRUARY, 29);
      TransitionContext context =
          new TransitionContext(null, submissionDate, null, false, false);

      LocalDate dayBeforeDeadline = LocalDate.of(2025, Month.FEBRUARY, 27);
      LocalDate deadline = LocalDate.of(2025, Month.FEBRUARY, 28);

      assertThat(transitionPolicyService.isAutoApproveEligible(context, dayBeforeDeadline))
          .isFalse();
      assertThat(transitionPolicyService.isAutoApproveEligible(context, deadline)).isTrue();

      // Changing setting to 6 months moves the deadline to 2024-08-29 without code changes
      autoApproveMonths = 6;
      assertThat(
              transitionPolicyService.isAutoApproveEligible(
                  context, LocalDate.of(2024, Month.AUGUST, 28)))
          .isFalse();
      assertThat(
              transitionPolicyService.isAutoApproveEligible(
                  context, LocalDate.of(2024, Month.AUGUST, 29)))
          .isTrue();
    }

    @Test
    @DisplayName("AUTO_APPROVE_BILLING fires at configured BILLING_DELAY_MONTHS boundary")
    void autoApproveBilling_respectsConfiguredDelayBoundary() {
      // Fixed month-end approval: 2026-10-31 + 1 month = 2026-11-30
      LocalDate approvedDate = LocalDate.of(2026, Month.OCTOBER, 31);
      TransitionContext context =
          new TransitionContext(null, null, approvedDate, false, false);

      LocalDate dayBeforeDeadline = LocalDate.of(2026, Month.NOVEMBER, 29);
      LocalDate deadline = LocalDate.of(2026, Month.NOVEMBER, 30);

      assertThat(transitionPolicyService.isAutoApproveBillingEligible(context, dayBeforeDeadline))
          .isFalse();
      assertThat(transitionPolicyService.isAutoApproveBillingEligible(context, deadline)).isTrue();

      // Changing setting to 3 months moves the deadline to 2027-01-31
      billingDelayMonths = 3;
      assertThat(transitionPolicyService.isAutoApproveBillingEligible(context, deadline))
          .isFalse();
      assertThat(
              transitionPolicyService.isAutoApproveBillingEligible(
                  context, LocalDate.of(2027, Month.JANUARY, 31)))
          .isTrue();
    }
  }

  @Nested
  @DisplayName("Edit Permissions and Matrix Consistency (Issue #1231)")
  class EditAndConsistency {

    @Test
    @DisplayName("canEdit enforces VIEWER read-only, SUBMITTER DRAFT/REJECTED, and staff states")
    void canEdit_enforcesPerRoleAndState() {
      for (String state :
          List.of(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.STATE_REJECTED,
              TransitionPolicyService.STATE_BILLING_APPROVED,
              TransitionPolicyService.STATE_CLOSED)) {
        TransitionEvaluationResult viewerResult =
            transitionPolicyService.canEdit(state, Role.VIEWER, IdentityProvider.IDIR);
        assertThat(viewerResult.allowed()).isFalse();
        assertThat(viewerResult.denialReason())
            .isEqualTo(TransitionEvaluationResult.DenialReason.ROLE_NOT_ALLOWED);
      }

      assertThat(
              transitionPolicyService
                  .canEdit(
                      TransitionPolicyService.STATE_DRAFT,
                      Role.SUBMITTER,
                      IdentityProvider.BUSINESS_BCEID)
                  .allowed())
          .isTrue();
      assertThat(
              transitionPolicyService
                  .canEdit(
                      TransitionPolicyService.STATE_REJECTED,
                      Role.SUBMITTER,
                      IdentityProvider.BUSINESS_BCEID)
                  .allowed())
          .isTrue();
      TransitionEvaluationResult submitterSubmitted =
          transitionPolicyService.canEdit(
              TransitionPolicyService.STATE_SUBMITTED,
              Role.SUBMITTER,
              IdentityProvider.BUSINESS_BCEID);
      assertThat(submitterSubmitted.allowed()).isFalse();
      assertThat(submitterSubmitted.denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.STATE_NOT_EDITABLE);

      assertThat(
              transitionPolicyService
                  .canEdit(
                      TransitionPolicyService.STATE_SUBMITTED,
                      Role.DISTRICT,
                      IdentityProvider.IDIR)
                  .allowed())
          .isTrue();
      assertThat(
              transitionPolicyService
                  .canEdit(
                      TransitionPolicyService.STATE_CLOSED, Role.ADMIN, IdentityProvider.IDIR)
                  .denialReason())
          .isEqualTo(TransitionEvaluationResult.DenialReason.STATE_NOT_EDITABLE);
    }

    @Test
    @DisplayName("Property consistency: every event in availableEvents evaluates to ALLOWED")
    void availableEvents_alwaysEvaluateToAllowed() {
      List<String> allStates =
          List.of(
              TransitionPolicyService.STATE_DRAFT,
              TransitionPolicyService.STATE_PLANNING,
              TransitionPolicyService.STATE_SUBMISSION,
              TransitionPolicyService.STATE_STAFF_REVIEW,
              TransitionPolicyService.STATE_SUBMITTED,
              TransitionPolicyService.STATE_HOLD,
              TransitionPolicyService.STATE_REJECTED,
              TransitionPolicyService.STATE_SUBMISSION_APPROVED,
              TransitionPolicyService.STATE_BILLING_APPROVED,
              TransitionPolicyService.STATE_ERROR,
              TransitionPolicyService.STATE_CANCELLED,
              TransitionPolicyService.STATE_CLOSED);

      List<TransitionContext> contexts =
          List.of(
              TransitionContext.empty(),
              new TransitionContext(
                  LocalDate.of(2024, Month.JANUARY, 1),
                  LocalDate.of(2026, Month.JANUARY, 1),
                  true,
                  true));

      for (String state : allStates) {
        for (Role role : Role.values()) {
          IdentityProvider idp =
              role == Role.SUBMITTER ? IdentityProvider.BUSINESS_BCEID : IdentityProvider.IDIR;
          for (TransitionContext ctx : contexts) {
            List<AvailableLifecycleEventDto> available =
                transitionPolicyService.availableEvents(state, role, idp, ctx);
            for (AvailableLifecycleEventDto dto : available) {
              TransitionEvaluationResult eval =
                  transitionPolicyService.evaluate(
                      state, dto.event(), role, idp, ctx, "valid comment");
              assertThat(eval.allowed())
                  .as("Expected %s from %s for %s to be ALLOWED", dto.event(), state, role)
                  .isTrue();
            }
          }
        }
      }
    }
  }
}
