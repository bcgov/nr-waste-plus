package ca.bc.gov.nrs.hrs.service.lifecycle;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventRequestDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventResponseDto;
import ca.bc.gov.nrs.hrs.entity.block.BlockCommentEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockEntity;
import ca.bc.gov.nrs.hrs.entity.block.BlockRequirementEntity;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.block.StatusEventEntity;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.IllegalTransitionException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.repository.block.BlockCommentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRequirementRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

  private final ReportingUnitRepository reportingUnitRepository;
  private final BlockRepository blockRepository;
  private final StatusEventRepository statusEventRepository;
  private final BlockRequirementRepository blockRequirementRepository;
  private final BlockCommentRepository blockCommentRepository;
  private final TransitionPolicyService transitionPolicyService;
  private final EntityManager entityManager;
  private final ObjectMapper objectMapper;

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

    validateRequest(request);

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
    Role role = resolveActorRole(jwt, reportingUnit.getClientNumber());
    IdentityProvider provider = JwtPrincipalUtil.getIdentityProvider(jwt);
    TransitionContext context = buildBlockTransitionContext(blockId, block.getPlcDate());

    TransitionEvaluationResult result =
        transitionPolicyService.evaluate(currentState, request.event(), role, provider, context);

    if (!result.allowed()) {
      log.warn(
          "Transition denied for block {} in RU {}: {}",
          blockId,
          reportingUnitId,
          result.reason());
      if (result.denialReason() == TransitionEvaluationResult.DenialReason.FORBIDDEN_ROLE) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, result.reason());
      }
      throw new IllegalTransitionException(result.reason());
    }

    final String targetState = result.targetState();
    updateBlockState(block, targetState);
    block = blockRepository.saveAndFlush(block);

    StatusEventEntity statusEvent = new StatusEventEntity();
    statusEvent.setBlockId(block.getId());
    statusEvent.setReportingUnitId(null);
    statusEvent.setStatus(targetState);
    statusEvent.setEventType(request.event().trim().toUpperCase(Locale.ROOT));

    if (request.comment() != null && !request.comment().isBlank()) {
      statusEvent.setDetails(
          objectMapper.createObjectNode().put("comment", request.comment().trim()));
    }
    statusEvent = statusEventRepository.save(statusEvent);

    if (request.comment() != null && !request.comment().isBlank()) {
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
        request.event().trim().toUpperCase(Locale.ROOT),
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

    validateRequest(request);

    ReportingUnitEntity reportingUnit =
        reportingUnitRepository
            .findByIdAndDeletedFalse(reportingUnitId)
            .orElseThrow(() -> new ReportingUnitNotFoundException(reportingUnitId));

    validateTenantAccess(jwt, reportingUnit);

    ConditionalRequestSupport.requireMatch(servletRequest, reportingUnit.getRevision());

    String currentState = resolveReportingUnitState(reportingUnitId);
    Role role = resolveActorRole(jwt, reportingUnit.getClientNumber());
    IdentityProvider provider = JwtPrincipalUtil.getIdentityProvider(jwt);

    TransitionEvaluationResult result =
        transitionPolicyService.evaluate(
            currentState, request.event(), role, provider, TransitionContext.empty());

    if (!result.allowed()) {
      log.warn(
          "Transition denied for RU {}: {}",
          reportingUnitId,
          result.reason());
      if (result.denialReason() == TransitionEvaluationResult.DenialReason.FORBIDDEN_ROLE) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, result.reason());
      }
      throw new IllegalTransitionException(result.reason());
    }

    final String targetState = result.targetState();
    reportingUnit.setUpdatedAt(Instant.now());
    reportingUnit = reportingUnitRepository.saveAndFlush(reportingUnit);

    StatusEventEntity statusEvent = new StatusEventEntity();
    statusEvent.setReportingUnitId(reportingUnit.getId());
    statusEvent.setBlockId(null);
    statusEvent.setStatus(targetState);
    statusEvent.setEventType(request.event().trim().toUpperCase(Locale.ROOT));

    if (request.comment() != null && !request.comment().isBlank()) {
      statusEvent.setDetails(
          objectMapper.createObjectNode().put("comment", request.comment().trim()));
    }
    statusEvent = statusEventRepository.save(statusEvent);
    entityManager.flush();

    Instant occurredAt =
        statusEvent.getCreatedAt() != null ? statusEvent.getCreatedAt() : Instant.now();

    return new LifecycleEventResponseDto(
        reportingUnit.getId(),
        null,
        currentState,
        targetState,
        request.event().trim().toUpperCase(Locale.ROOT),
        reportingUnit.getRevision(),
        occurredAt);
  }

  private void validateRequest(LifecycleEventRequestDto request) {
    if (request == null || request.event() == null || request.event().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event is required");
    }
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
        Set<String> assignedDistricts = extractAssignedDistricts(jwt);
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

  private Set<String> extractAssignedDistricts(Jwt jwt) {
    Set<String> districts = new HashSet<>();
    if (jwt == null) {
      return districts;
    }
    Map<Role, List<String>> roles = JwtPrincipalUtil.getRoles(jwt);
    if (roles.containsKey(Role.DISTRICT)) {
      districts.addAll(roles.get(Role.DISTRICT));
    }
    for (String key : List.of("custom:idp_district", "custom:district")) {
      Object val = jwt.getClaims().get(key);
      if (val instanceof String s && !s.isBlank()) {
        districts.add(s.trim());
      }
    }
    return districts;
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

    return new TransitionContext(
        plcDate, LocalDate.now(ZoneOffset.UTC), rationaleRequired, burntPiles);
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
      // When cancelled, preserve existing draft flag and statusCode; status_event records state
    }
  }
}
