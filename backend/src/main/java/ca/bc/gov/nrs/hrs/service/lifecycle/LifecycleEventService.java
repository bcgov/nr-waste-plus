package ca.bc.gov.nrs.hrs.service.lifecycle;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentStatus;
import ca.bc.gov.nrs.hrs.dto.block.AvailableLifecycleEventDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleDetailsDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventRequestDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventResponseDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleHistoryItemDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleViewResult;
import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.IllegalTransitionException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.repository.block.BlockAttachmentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockCommentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRequirementRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import ca.bc.gov.nrs.hrs.security.ResourceScopeGuard;
import ca.bc.gov.nrs.hrs.util.ConditionalRequestSupport;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service managing lifecycle event transitions for submission blocks and reporting units.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Observed
public class LifecycleEventService {

  private static final String CONTEXT_LIFECYCLE = "LIFECYCLE";
  private static final String REQ_RATIONALE = "RATIONALE_REQUIRED";
  private static final String REQ_BURNT_PILES = "BURNT_PILES";
  private static final String DETAIL_HAS_COMMENT = "hasComment";
  private static final String CODE_COMMENT_REQUIRED = "COMMENT_REQUIRED";
  private static final String CODE_PRECONDITION_FAILED = "PRECONDITION_FAILED";
  private static final String SYSTEM_ACTOR = "SYSTEM";
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final StatusEventRepository statusEventRepository;
  private final BlockRequirementRepository blockRequirementRepository;
  private final BlockAttachmentRepository blockAttachmentRepository;
  private final BlockCommentRepository blockCommentRepository;
  private final TransitionPolicyService transitionPolicyService;
  private final ResourceScopeGuard resourceScopeGuard;
  private final EntityManager entityManager;

  /**
   * Applies a lifecycle event to a submission block.
   *
   * @param servletRequest HTTP request carrying the required {@code If-Match} header
   * @param jwt caller JWT principal
   * @param reportingUnitId target reporting unit identifier
   * @param blockId target block identifier
   * @param request event payload
   * @return lifecycle event response with updated revision and state
   */
  @NewSpan
  @Transactional
  public LifecycleEventResponseDto recordBlockLifecycleEvent(
      HttpServletRequest servletRequest,
      Jwt jwt,
      Long reportingUnitId,
      Long blockId,
      LifecycleEventRequestDto request) {

    String normalizedEvent = validateAndNormalizeEvent(request);

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    BlockEntity block =
        blockRepository
            .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
            .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    ConditionalRequestSupport.requireMatch(servletRequest, block.getRevision());

    String currentState = resolveBlockState(blockId, block.isDraft());
    rejectSystemOnlyEvent(currentState, normalizedEvent);

    Role role = resolveActorRole(jwt, reportingUnit.getClientNumber());
    IdentityProvider provider = JwtPrincipalUtil.getIdentityProvider(jwt);
    TransitionContext context = buildBlockTransitionContext(blockId, block.getPlcDate());

    TransitionEvaluationResult result =
        transitionPolicyService.evaluate(
            currentState, normalizedEvent, role, provider, context);

    if (!result.allowed()) {
      log.warn(
          "Transition denied for block {} in RU {}: {}",
          blockId,
          reportingUnitId,
          result.reason());
      throwTransitionDenied(result, currentState);
    }

    validateRequiredComment(currentState, normalizedEvent, request.comment());

    if (TransitionPolicyService.EVENT_SUBMIT.equals(normalizedEvent)) {
      validateBlockSubmissionReadiness(block, currentState);
    }

    rejectUnimplementedExternalStep(result, currentState);

    final String targetState = result.targetState();
    updateBlockState(block, targetState);
    block.setUpdatedAt(Instant.now());
    block = blockRepository.saveAndFlush(block);

    StatusEventEntity statusEvent = new StatusEventEntity();
    statusEvent.setBlockId(block.getId());
    statusEvent.setReportingUnitId(null);
    statusEvent.setStatus(targetState);
    statusEvent.setEventType(normalizedEvent);

    boolean hasComment = request.comment() != null && !request.comment().isBlank();
    var detailsNode = OBJECT_MAPPER.createObjectNode();
    detailsNode.put("previousState", currentState);
    detailsNode.put(DETAIL_HAS_COMMENT, hasComment);
    statusEvent.setDetails(detailsNode);
    statusEvent = statusEventRepository.save(statusEvent);

    if (hasComment) {
      BlockCommentEntity commentEntity = new BlockCommentEntity();
      commentEntity.setBlockId(block.getId());
      commentEntity.setContext(CONTEXT_LIFECYCLE);
      commentEntity.setComment(request.comment().trim());
      commentEntity.setStatusEventId(statusEvent.getId());
      blockCommentRepository.save(commentEntity);
    }

    entityManager.flush();

    Instant occurredAt =
        statusEvent.getCreatedAt() != null ? statusEvent.getCreatedAt() : Instant.now();

    return new LifecycleEventResponseDto(
        reportingUnit.getId(),
        block.getId(),
        currentState,
        targetState,
        normalizedEvent,
        block.getRevision(),
        occurredAt);
  }

  /**
   * Applies a lifecycle event to a reporting unit.
   *
   * @param servletRequest HTTP request carrying the required {@code If-Match} header
   * @param jwt caller JWT principal
   * @param reportingUnitId target reporting unit identifier
   * @param request event payload
   * @return lifecycle event response with updated revision and state
   */
  @NewSpan
  @Transactional
  public LifecycleEventResponseDto recordReportingUnitLifecycleEvent(
      HttpServletRequest servletRequest,
      Jwt jwt,
      Long reportingUnitId,
      LifecycleEventRequestDto request) {

    String normalizedEvent = validateAndNormalizeEvent(request);

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    ConditionalRequestSupport.requireMatch(servletRequest, reportingUnit.getRevision());

    String currentState = resolveReportingUnitState(reportingUnitId);
    rejectSystemOnlyEvent(currentState, normalizedEvent);

    Role role = resolveActorRole(jwt, reportingUnit.getClientNumber());
    IdentityProvider provider = JwtPrincipalUtil.getIdentityProvider(jwt);

    TransitionEvaluationResult result =
        transitionPolicyService.evaluate(
            currentState, normalizedEvent, role, provider, TransitionContext.empty());

    if (!result.allowed()) {
      log.warn("Transition denied for RU {}: {}", reportingUnitId, result.reason());
      throwTransitionDenied(result, currentState);
    }

    validateRequiredComment(currentState, normalizedEvent, request.comment());

    final String targetState = result.targetState();
    reportingUnit.setUpdatedAt(Instant.now());
    reportingUnit = reportingUnitRepository.saveAndFlush(reportingUnit);

    StatusEventEntity statusEvent = new StatusEventEntity();
    statusEvent.setReportingUnitId(reportingUnit.getId());
    statusEvent.setBlockId(null);
    statusEvent.setStatus(targetState);
    statusEvent.setEventType(normalizedEvent);

    boolean hasComment = request.comment() != null && !request.comment().isBlank();
    var detailsNode = OBJECT_MAPPER.createObjectNode();
    detailsNode.put("previousState", currentState);
    detailsNode.put(DETAIL_HAS_COMMENT, hasComment);
    statusEvent.setDetails(detailsNode);
    statusEvent = statusEventRepository.save(statusEvent);
    entityManager.flush();

    Instant occurredAt =
        statusEvent.getCreatedAt() != null ? statusEvent.getCreatedAt() : Instant.now();

    return new LifecycleEventResponseDto(
        reportingUnit.getId(),
        null,
        currentState,
        targetState,
        normalizedEvent,
        reportingUnit.getRevision(),
        occurredAt);
  }

  private void rejectSystemOnlyEvent(String currentState, String normalizedEvent) {
    if (transitionPolicyService.isSystemOnly(currentState, normalizedEvent)) {
      throw lifecycleStatusException(
          HttpStatus.FORBIDDEN,
          "Event '" + normalizedEvent + "' is system-only and cannot be triggered via HTTP",
          "SYSTEM_ONLY_EVENT",
          currentState);
    }
  }

  private void throwTransitionDenied(TransitionEvaluationResult result, String currentState) {
    if (result.denialReason() == TransitionEvaluationResult.DenialReason.ROLE_NOT_ALLOWED) {
      throw lifecycleStatusException(
          HttpStatus.FORBIDDEN, result.reason(), "ROLE_NOT_ALLOWED", currentState);
    }
    if (result.denialReason() == TransitionEvaluationResult.DenialReason.COMMENT_REQUIRED) {
      throw lifecycleStatusException(
          HttpStatus.UNPROCESSABLE_CONTENT, result.reason(), CODE_COMMENT_REQUIRED, currentState);
    }
    if (result.denialReason() == TransitionEvaluationResult.DenialReason.PRECONDITION_FAILED) {
      throw lifecycleStatusException(
          HttpStatus.UNPROCESSABLE_CONTENT,
          result.reason(),
          CODE_PRECONDITION_FAILED,
          currentState);
    }
    throw new IllegalTransitionException(
        result.reason(), "ILLEGAL_TRANSITION", currentState, false);
  }

  private void validateRequiredComment(
      String currentState, String normalizedEvent, String comment) {
    if (transitionPolicyService.isCommentRequired(currentState, normalizedEvent)
        && (comment == null || comment.isBlank())) {
      throw lifecycleStatusException(
          HttpStatus.UNPROCESSABLE_CONTENT,
          "A comment is required for this event",
          CODE_COMMENT_REQUIRED,
          currentState);
    }
  }

  private void rejectUnimplementedExternalStep(
      TransitionEvaluationResult result, String currentState) {
    if (result.externalStep() != null && !result.externalStep().isBlank()) {
      throw lifecycleStatusException(
          HttpStatus.NOT_IMPLEMENTED,
          "External step '" + result.externalStep() + "' is not yet integrated (#1552).",
          "EXTERNAL_STEP_NOT_IMPLEMENTED",
          currentState);
    }
  }

  private ResponseStatusException lifecycleStatusException(
      HttpStatus status, String message, String code, String currentState) {
    ResponseStatusException ex = new ResponseStatusException(status, message);
    ex.getBody().setProperty("code", code);
    ex.getBody().setProperty("state", currentState);
    ex.getBody().setProperty("blockState", currentState);
    ex.getBody().setProperty("retryable", false);
    return ex;
  }

  private String validateAndNormalizeEvent(LifecycleEventRequestDto request) {
    if (request == null || request.event() == null || request.event().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event is required");
    }
    String normalizedEvent = request.event().trim().toUpperCase(Locale.ROOT);
    if (!transitionPolicyService.isKnownEvent(normalizedEvent)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Unknown lifecycle event: " + normalizedEvent);
    }
    return normalizedEvent;
  }

  private void validateTenantAccess(Jwt jwt, ReportingUnitEntity reportingUnit) {
    if (jwt == null) {
      return;
    }
    IdentityProvider idp = JwtPrincipalUtil.getIdentityProvider(jwt);
    if (IdentityProvider.BUSINESS_BCEID == idp) {
      List<String> userClientNumbers = JwtPrincipalUtil.getClientFromRoles(jwt);
      if (!userClientNumbers.contains(reportingUnit.getClientNumber())) {
        log.warn(
            "SECURITY: BCeID user {} attempted unauthorized access to reporting unit {}",
            JwtPrincipalUtil.getUserId(jwt),
            reportingUnit.getId());
        throw new ReportingUnitNotFoundException(reportingUnit.getId());
      }
    } else if (IdentityProvider.IDIR == idp) {
      if (JwtPrincipalUtil.hasConcreteRole(jwt, Role.DISTRICT)) {
        Set<String> assignedDistricts = resourceScopeGuard.extractAssignedDistricts(jwt);
        String targetDistrict = reportingUnit.getGeographicCode();
        if (targetDistrict == null
            || assignedDistricts.stream().noneMatch(d -> d.equalsIgnoreCase(targetDistrict))) {
          log.warn(
              "SECURITY: IDIR DISTRICT user {} unauthorized access to RU {} in district {}",
              JwtPrincipalUtil.getUserId(jwt),
              reportingUnit.getId(),
              targetDistrict);
          throw new ReportingUnitNotFoundException(reportingUnit.getId());
        }
      }
    }
  }

  private Role resolveActorRole(Jwt jwt, String clientNumber) {
    if (jwt == null) {
      return Role.VIEWER;
    }
    if (JwtPrincipalUtil.hasConcreteRole(jwt, Role.ADMIN)) {
      return Role.ADMIN;
    }
    if (JwtPrincipalUtil.hasConcreteRole(jwt, Role.AREA)) {
      return Role.AREA;
    }
    if (JwtPrincipalUtil.hasConcreteRole(jwt, Role.DISTRICT)) {
      return Role.DISTRICT;
    }
    if (clientNumber != null
        && JwtPrincipalUtil.hasAbstractRole(jwt, Role.SUBMITTER, clientNumber)) {
      return Role.SUBMITTER;
    }
    return Role.VIEWER;
  }

  private String resolveBlockState(Long blockId, boolean isDraft) {
    return statusEventRepository
        .findFirstByBlockIdOrderByCreatedAtDescIdDesc(blockId)
        .map(StatusEventEntity::getStatus)
        .orElse(
            isDraft
                ? TransitionPolicyService.STATE_DRAFT
                : TransitionPolicyService.STATE_SUBMITTED);
  }

  private String resolveReportingUnitState(Long reportingUnitId) {
    return statusEventRepository
        .findFirstByReportingUnitIdOrderByCreatedAtDescIdDesc(reportingUnitId)
        .map(StatusEventEntity::getStatus)
        .orElse(TransitionPolicyService.STATE_SUBMISSION);
  }

  private TransitionContext buildBlockTransitionContext(Long blockId, LocalDate plcDate) {
    List<BlockRequirementEntity> requirements =
        blockRequirementRepository.findByBlockIdAndDeletedFalse(blockId);
    boolean rationaleRequired =
        requirements.stream()
            .anyMatch(
                r ->
                    REQ_RATIONALE.equalsIgnoreCase(r.getRequirementCode())
                        && Boolean.TRUE.equals(r.getAnsweredYes()));
    boolean burntPiles =
        requirements.stream()
            .anyMatch(
                r ->
                    REQ_BURNT_PILES.equalsIgnoreCase(r.getRequirementCode())
                        && Boolean.TRUE.equals(r.getAnsweredYes()));

    LocalDate submissionDate = resolveSubmissionDate(blockId);
    LocalDate approvedDate = resolveApprovedDate(blockId);

    return new TransitionContext(
        plcDate, submissionDate, approvedDate, rationaleRequired, burntPiles);
  }

  /**
   * Executes a scheduled {@code SYSTEM} lifecycle event for a block, using the same policy
   * evaluation and state-persistence path as HTTP transitions.
   *
   * @param blockId target block identifier
   * @param event system event code (e.g. {@code AUTO_APPROVE}, {@code AUTO_APPROVE_BILLING})
   * @return response DTO if the transition was applied, or {@code null} if preconditions were not
   *     met or an external step (#1552) is deferred
   */
  @NewSpan
  @Transactional
  public LifecycleEventResponseDto recordSystemBlockLifecycleEvent(Long blockId, String event) {
    BlockEntity block = blockRepository.findById(blockId).orElse(null);
    if (block == null || block.isDeleted()) {
      return null;
    }

    String normalizedEvent = event.trim().toUpperCase(Locale.ROOT);
    String currentState = resolveBlockState(blockId, block.isDraft());
    TransitionContext context = buildBlockTransitionContext(blockId, block.getPlcDate());

    TransitionEvaluationResult result =
        transitionPolicyService.evaluateAsSystem(currentState, normalizedEvent, context);
    if (!result.allowed()) {
      return null;
    }

    if (result.externalStep() != null && !result.externalStep().isBlank()) {
      // HBS invoice post integration is owned by #1552; leave block in SUBMISSION_APPROVED until
      // HbsBillingService is wired.
      log.debug(
          "Skipping system transition {} for block {}: external step '{}' awaits #1552.",
          normalizedEvent,
          blockId,
          result.externalStep());
      return null;
    }

    final String targetState = result.targetState();
    updateBlockState(block, targetState);
    block.setUpdatedAt(Instant.now());
    block.setUpdatedBy(SYSTEM_ACTOR);
    block = blockRepository.saveAndFlush(block);

    StatusEventEntity statusEvent = new StatusEventEntity();
    statusEvent.setBlockId(block.getId());
    statusEvent.setReportingUnitId(null);
    statusEvent.setStatus(targetState);
    statusEvent.setEventType(normalizedEvent);
    statusEvent.setCreatedBy(SYSTEM_ACTOR);
    statusEvent.setUpdatedBy(SYSTEM_ACTOR);

    var detailsNode = OBJECT_MAPPER.createObjectNode();
    detailsNode.put("previousState", currentState);
    detailsNode.put(DETAIL_HAS_COMMENT, false);
    detailsNode.put("actor", SYSTEM_ACTOR);
    statusEvent.setDetails(detailsNode);
    statusEvent = statusEventRepository.save(statusEvent);
    entityManager.flush();

    Instant occurredAt =
        statusEvent.getCreatedAt() != null ? statusEvent.getCreatedAt() : Instant.now();

    return new LifecycleEventResponseDto(
        block.getReportingUnitId(),
        block.getId(),
        currentState,
        targetState,
        normalizedEvent,
        block.getRevision(),
        occurredAt);
  }

  private void validateBlockSubmissionReadiness(BlockEntity block, String currentState) {
    if (block.getPlcDate() == null) {
      ResponseStatusException ex =
          new ResponseStatusException(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Cannot submit block: planned completion date (plcDate) is required.");
      ex.getBody().setProperty("code", CODE_PRECONDITION_FAILED);
      ex.getBody().setProperty("state", currentState);
      ex.getBody().setProperty("blockState", currentState);
      ex.getBody().setProperty("retryable", false);
      throw ex;
    }
    long totalAttachments =
        blockAttachmentRepository.countByBlockIdAndDeletedFalse(block.getId());
    long validAttachments =
        blockAttachmentRepository.countByBlockIdAndStatusAndScanStatusAndDeletedFalse(
            block.getId(),
            AttachmentStatus.FINALIZED.name(),
            AttachmentScanStatus.CLEAN.name());
    if (totalAttachments != validAttachments) {
      ResponseStatusException ex =
          new ResponseStatusException(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Cannot submit block: all attachments must be finalized and clean of malware.");
      ex.getBody().setProperty("code", CODE_PRECONDITION_FAILED);
      ex.getBody().setProperty("state", currentState);
      ex.getBody().setProperty("blockState", currentState);
      ex.getBody().setProperty("retryable", false);
      throw ex;
    }
  }

  /**
   * Retrieves the current lifecycle details, available events, and history for a block.
   *
   * @param jwt caller JWT principal
   * @param reportingUnitId target reporting unit identifier
   * @param blockId target block identifier
   * @return view result pairing the details payload with the block revision
   */
  @NewSpan
  @Transactional(readOnly = true)
  public LifecycleViewResult viewBlockLifecycle(
      Jwt jwt,
      Long reportingUnitId,
      Long blockId) {

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    BlockEntity block =
        blockRepository
            .findByIdAndReportingUnitIdAndDeletedFalse(blockId, reportingUnitId)
            .orElseThrow(() -> new BlockNotFoundException(blockId, reportingUnitId));

    String currentState = resolveBlockState(blockId, block.isDraft());
    Role role = resolveActorRole(jwt, reportingUnit.getClientNumber());
    IdentityProvider provider = JwtPrincipalUtil.getIdentityProvider(jwt);
    TransitionContext context = buildBlockTransitionContext(blockId, block.getPlcDate());

    List<AvailableLifecycleEventDto> availableEvents =
        transitionPolicyService.availableEvents(currentState, role, provider, context);

    List<StatusEventEntity> events =
        statusEventRepository.findByBlockIdOrderByCreatedAtAscIdAsc(blockId);

    List<LifecycleHistoryItemDto> history =
        mapToHistoryItems(events, TransitionPolicyService.STATE_DRAFT);

    LifecycleDetailsDto details = new LifecycleDetailsDto(currentState, availableEvents, history);
    return new LifecycleViewResult(details, block.getRevision());
  }

  /**
   * Retrieves the current lifecycle details, available events, and history for a reporting unit.
   *
   * @param jwt caller JWT principal
   * @param reportingUnitId target reporting unit identifier
   * @return view result pairing the details payload with the reporting unit revision
   */
  @NewSpan
  @Transactional(readOnly = true)
  public LifecycleViewResult viewReportingUnitLifecycle(
      Jwt jwt,
      Long reportingUnitId) {

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    String currentState = resolveReportingUnitState(reportingUnitId);
    Role role = resolveActorRole(jwt, reportingUnit.getClientNumber());
    IdentityProvider provider = JwtPrincipalUtil.getIdentityProvider(jwt);

    List<AvailableLifecycleEventDto> availableEvents =
        transitionPolicyService.availableEvents(
            currentState, role, provider, TransitionContext.empty());

    List<StatusEventEntity> events =
        statusEventRepository.findByReportingUnitIdOrderByCreatedAtAscIdAsc(reportingUnitId);

    List<LifecycleHistoryItemDto> history =
        mapToHistoryItems(events, TransitionPolicyService.STATE_SUBMISSION);

    LifecycleDetailsDto details = new LifecycleDetailsDto(currentState, availableEvents, history);
    return new LifecycleViewResult(details, reportingUnit.getRevision());
  }

  private List<LifecycleHistoryItemDto> mapToHistoryItems(
      List<StatusEventEntity> events, String defaultInitialState) {
    List<LifecycleHistoryItemDto> history = new ArrayList<>();
    String previousState = defaultInitialState;
    for (StatusEventEntity se : events) {
      String fromState = previousState;
      if (se.getDetails() != null && se.getDetails().has("previousState")) {
        fromState = se.getDetails().get("previousState").asText();
      } else if (se.getDetails() != null && se.getDetails().has("fromState")) {
        fromState = se.getDetails().get("fromState").asText();
      }
      String comment = null;
      if (se.getDetails() != null && se.getDetails().has("comment")) {
        comment = se.getDetails().get("comment").asText();
      }
      String toState = se.getStatus();
      String actor = se.getCreatedBy();
      history.add(
          new LifecycleHistoryItemDto(
              se.getId(),
              se.getEventType(),
              fromState,
              toState,
              actor,
              se.getCreatedAt(),
              comment));
      previousState = toState;
    }
    return Collections.unmodifiableList(history);
  }

  private LocalDate resolveSubmissionDate(Long blockId) {
    return statusEventRepository
        .findFirstByBlockIdAndEventTypeOrderByCreatedAtDesc(
            blockId, TransitionPolicyService.EVENT_SUBMIT)
        .map(StatusEventEntity::getCreatedAt)
        .map(instant -> LocalDate.ofInstant(instant, ZoneOffset.UTC))
        .orElse(LocalDate.now(ZoneOffset.UTC));
  }

  private LocalDate resolveApprovedDate(Long blockId) {
    return statusEventRepository
        .findFirstByBlockIdAndStatusOrderByCreatedAtAsc(
            blockId, TransitionPolicyService.STATE_SUBMISSION_APPROVED)
        .map(StatusEventEntity::getCreatedAt)
        .map(instant -> LocalDate.ofInstant(instant, ZoneOffset.UTC))
        .orElse(null);
  }

  private void updateBlockState(BlockEntity block, String targetState) {
    if (TransitionPolicyService.STATE_DRAFT.equalsIgnoreCase(targetState)) {
      block.setDraft(true);
      block.setStatusCode("DFT");
    } else if (TransitionPolicyService.STATE_SUBMITTED.equalsIgnoreCase(targetState)) {
      block.setDraft(false);
      block.setStatusCode("SUB");
    } else if (TransitionPolicyService.STATE_HOLD.equalsIgnoreCase(targetState)) {
      block.setDraft(false);
      block.setStatusCode("HLD");
    } else if (TransitionPolicyService.STATE_SUBMISSION_APPROVED.equalsIgnoreCase(targetState)
        || TransitionPolicyService.STATE_APPROVED.equalsIgnoreCase(targetState)) {
      block.setDraft(false);
      block.setStatusCode("APP");
    } else if (TransitionPolicyService.STATE_REJECTED.equalsIgnoreCase(targetState)) {
      block.setDraft(false);
      block.setStatusCode("REJ");
    } else if (TransitionPolicyService.STATE_BILLING_APPROVED.equalsIgnoreCase(targetState)) {
      block.setDraft(false);
      block.setStatusCode("RTB");
    } else if (TransitionPolicyService.STATE_CANCELLED.equalsIgnoreCase(targetState)) {
      block.setDraft(false);
      block.setStatusCode("CAN");
    }
  }
}
