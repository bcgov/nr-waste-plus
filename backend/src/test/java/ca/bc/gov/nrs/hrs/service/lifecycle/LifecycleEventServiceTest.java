package ca.bc.gov.nrs.hrs.service.lifecycle;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import ca.bc.gov.nrs.hrs.exception.ConditionalRequestException;
import ca.bc.gov.nrs.hrs.exception.IllegalTransitionException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.repository.block.BlockCommentRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRepository;
import ca.bc.gov.nrs.hrs.repository.block.BlockRequirementRepository;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.block.StatusEventRepository;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Lifecycle Event Service")
class LifecycleEventServiceTest {

  private static final Long RU_ID = 37870L;
  private static final Long BLOCK_ID = 12345L;
  private static final String CLIENT_NUMBER = "00012345";

  @Mock
  private ReportingUnitRepository reportingUnitRepository;

  @Mock
  private BlockRepository blockRepository;

  @Mock
  private StatusEventRepository statusEventRepository;

  @Mock
  private BlockRequirementRepository blockRequirementRepository;

  @Mock
  private BlockCommentRepository blockCommentRepository;

  @Mock
  private TransitionPolicyService transitionPolicyService;

  @Mock
  private EntityManager entityManager;

  @InjectMocks
  private LifecycleEventService lifecycleEventService;

  private ReportingUnitEntity reportingUnit;
  private BlockEntity block;
  private Jwt submitterJwt;

  @BeforeEach
  void setUp() {
    reportingUnit = new ReportingUnitEntity();
    reportingUnit.setId(RU_ID);
    reportingUnit.setClientNumber(CLIENT_NUMBER);
    reportingUnit.setRevision(10L);

    block = new BlockEntity();
    block.setId(BLOCK_ID);
    block.setReportingUnitId(RU_ID);
    block.setBlockType("DISTRICT_AVERAGE");
    block.setDraft(true);
    block.setRevision(5L);
    block.setPlcDate(LocalDate.now().minusMonths(2));

    submitterJwt =
        Jwt.withTokenValue("mock-token")
            .header("alg", "none")
            .claim("custom:idp_name", "bceidbusiness")
            .claim("cognito:groups", List.of("WASTE_PLUS_SUBMITTER_" + CLIENT_NUMBER))
            .build();
  }

  @Nested
  @DisplayName("Block Lifecycle Events")
  class BlockLifecycleEvents {

    @Test
    @DisplayName("Legal SUBMIT transition creates status event, bumps revision, and returns 200 OK DTO")
    void recordBlockLifecycleEvent_success() {
      MockHttpServletRequest request = new MockHttpServletRequest();
      request.addHeader("If-Match", "\"5\"");

      LifecycleEventRequestDto requestDto =
          new LifecycleEventRequestDto("SUBMIT", "Submission comments");

      when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
          .thenReturn(Optional.of(reportingUnit));
      when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
          .thenReturn(Optional.of(block));
      when(statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(BLOCK_ID))
          .thenReturn(Optional.empty());
      when(blockRequirementRepository.findByBlockIdAndDeletedFalse(BLOCK_ID))
          .thenReturn(Collections.emptyList());

      when(transitionPolicyService.evaluate(
              eq("DRAFT"), eq("SUBMIT"), eq(Role.SUBMITTER), eq(IdentityProvider.BUSINESS_BCEID), any()))
          .thenReturn(TransitionEvaluationResult.allowed("SUBMITTED"));

      when(blockRepository.saveAndFlush(any(BlockEntity.class)))
          .thenAnswer(
              invocation -> {
                BlockEntity b = invocation.getArgument(0);
                b.setRevision(6L);
                return b;
              });

      StatusEventEntity savedEvent = new StatusEventEntity();
      savedEvent.setId(999L);
      savedEvent.setBlockId(BLOCK_ID);
      savedEvent.setStatus("SUBMITTED");
      savedEvent.setEventType("SUBMIT");
      savedEvent.setCreatedAt(Instant.parse("2026-08-24T12:00:00Z"));

      when(statusEventRepository.save(any(StatusEventEntity.class))).thenReturn(savedEvent);

      LifecycleEventResponseDto response =
          lifecycleEventService.recordBlockLifecycleEvent(
              request, submitterJwt, RU_ID, BLOCK_ID, requestDto);

      assertThat(response).isNotNull();
      assertThat(response.reportingUnitId()).isEqualTo(RU_ID);
      assertThat(response.blockId()).isEqualTo(BLOCK_ID);
      assertThat(response.previousState()).isEqualTo("DRAFT");
      assertThat(response.state()).isEqualTo("SUBMITTED");
      assertThat(response.event()).isEqualTo("SUBMIT");
      assertThat(response.version()).isEqualTo(6L);

      ArgumentCaptor<StatusEventEntity> eventCaptor =
          ArgumentCaptor.forClass(StatusEventEntity.class);
      verify(statusEventRepository).save(eventCaptor.capture());
      StatusEventEntity captured = eventCaptor.getValue();
      assertThat(captured.getBlockId()).isEqualTo(BLOCK_ID);
      assertThat(captured.getReportingUnitId()).isNull(); // XOR subject check
      assertThat(captured.getStatus()).isEqualTo("SUBMITTED");
      assertThat(captured.getEventType()).isEqualTo("SUBMIT");

      ArgumentCaptor<BlockCommentEntity> commentCaptor =
          ArgumentCaptor.forClass(BlockCommentEntity.class);
      verify(blockCommentRepository).save(commentCaptor.capture());
      BlockCommentEntity capturedComment = commentCaptor.getValue();
      assertThat(capturedComment.getBlockId()).isEqualTo(BLOCK_ID);
      assertThat(capturedComment.getContext()).isEqualTo("LIFECYCLE");
      assertThat(capturedComment.getComment()).isEqualTo("Submission comments");
      assertThat(capturedComment.getStatusEventId()).isEqualTo(999L);
    }

    @Test
    @DisplayName("Illegal transition throws IllegalTransitionException and writes zero status events")
    void recordBlockLifecycleEvent_illegalTransition_throwsAndWritesZeroRows() {
      MockHttpServletRequest request = new MockHttpServletRequest();
      request.addHeader("If-Match", "\"5\"");

      LifecycleEventRequestDto requestDto = new LifecycleEventRequestDto("SUBMIT", null);

      when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
          .thenReturn(Optional.of(reportingUnit));
      when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
          .thenReturn(Optional.of(block));
      when(statusEventRepository.findFirstByBlockIdOrderByCreatedAtDesc(BLOCK_ID))
          .thenReturn(Optional.empty());
      when(blockRequirementRepository.findByBlockIdAndDeletedFalse(BLOCK_ID))
          .thenReturn(Collections.emptyList());

      when(transitionPolicyService.evaluate(any(), any(), any(), any(), any()))
          .thenReturn(
              TransitionEvaluationResult.denied("Illegal transition: event SUBMIT is not permitted"));

      assertThatThrownBy(
              () ->
                  lifecycleEventService.recordBlockLifecycleEvent(
                      request, submitterJwt, RU_ID, BLOCK_ID, requestDto))
          .isInstanceOf(IllegalTransitionException.class)
          .hasMessageContaining("Illegal transition");

      verify(statusEventRepository, never()).save(any());
      verify(blockCommentRepository, never()).save(any());
      verify(blockRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Stale or missing If-Match header throws ConditionalRequestException")
    void recordBlockLifecycleEvent_staleIfMatch_throws() {
      MockHttpServletRequest request = new MockHttpServletRequest();
      request.addHeader("If-Match", "\"999\""); // expected is "5"

      LifecycleEventRequestDto requestDto = new LifecycleEventRequestDto("SUBMIT", null);

      when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
          .thenReturn(Optional.of(reportingUnit));
      when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
          .thenReturn(Optional.of(block));

      assertThatThrownBy(
              () ->
                  lifecycleEventService.recordBlockLifecycleEvent(
                      request, submitterJwt, RU_ID, BLOCK_ID, requestDto))
          .isInstanceOf(ConditionalRequestException.class);

      verify(transitionPolicyService, never()).evaluate(any(), any(), any(), any(), any());
      verify(statusEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("Block not found under RU throws BlockNotFoundException")
    void recordBlockLifecycleEvent_unknownBlock_throws() {
      MockHttpServletRequest request = new MockHttpServletRequest();
      request.addHeader("If-Match", "\"5\"");

      LifecycleEventRequestDto requestDto = new LifecycleEventRequestDto("SUBMIT", null);

      when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
          .thenReturn(Optional.of(reportingUnit));
      when(blockRepository.findByIdAndReportingUnitIdAndDeletedFalse(BLOCK_ID, RU_ID))
          .thenReturn(Optional.empty());

      assertThatThrownBy(
              () ->
                  lifecycleEventService.recordBlockLifecycleEvent(
                      request, submitterJwt, RU_ID, BLOCK_ID, requestDto))
          .isInstanceOf(BlockNotFoundException.class);
    }
  }

  @Nested
  @DisplayName("Reporting Unit Lifecycle Events")
  class ReportingUnitLifecycleEvents {

    @Test
    @DisplayName("Legal reporting unit transition updates revision, persists event with null blockId")
    void recordReportingUnitLifecycleEvent_success() {
      MockHttpServletRequest request = new MockHttpServletRequest();
      request.addHeader("If-Match", "\"10\"");

      LifecycleEventRequestDto requestDto = new LifecycleEventRequestDto("SUBMIT", null);

      when(reportingUnitRepository.findByIdAndDeletedFalse(RU_ID))
          .thenReturn(Optional.of(reportingUnit));
      when(statusEventRepository.findFirstByReportingUnitIdOrderByCreatedAtDescIdDesc(RU_ID))
          .thenReturn(Optional.empty());

      when(transitionPolicyService.evaluate(
              eq("SUBMISSION"), eq("SUBMIT"), eq(Role.SUBMITTER), eq(IdentityProvider.BUSINESS_BCEID), any()))
          .thenReturn(TransitionEvaluationResult.allowed("SUBMITTED"));

      when(reportingUnitRepository.saveAndFlush(any(ReportingUnitEntity.class)))
          .thenAnswer(
              invocation -> {
                ReportingUnitEntity ru = invocation.getArgument(0);
                ru.setRevision(11L);
                return ru;
              });

      StatusEventEntity savedEvent = new StatusEventEntity();
      savedEvent.setId(1001L);
      savedEvent.setReportingUnitId(RU_ID);
      savedEvent.setStatus("SUBMITTED");
      savedEvent.setEventType("SUBMIT");
      savedEvent.setCreatedAt(Instant.parse("2026-08-24T12:00:00Z"));

      when(statusEventRepository.save(any(StatusEventEntity.class))).thenReturn(savedEvent);

      LifecycleEventResponseDto response =
          lifecycleEventService.recordReportingUnitLifecycleEvent(
              request, submitterJwt, RU_ID, requestDto);

      assertThat(response).isNotNull();
      assertThat(response.reportingUnitId()).isEqualTo(RU_ID);
      assertThat(response.blockId()).isNull();
      assertThat(response.previousState()).isEqualTo("SUBMISSION");
      assertThat(response.state()).isEqualTo("SUBMITTED");
      assertThat(response.event()).isEqualTo("SUBMIT");
      assertThat(response.version()).isEqualTo(11L);

      ArgumentCaptor<StatusEventEntity> eventCaptor =
          ArgumentCaptor.forClass(StatusEventEntity.class);
      verify(statusEventRepository).save(eventCaptor.capture());
      StatusEventEntity captured = eventCaptor.getValue();
      assertThat(captured.getReportingUnitId()).isEqualTo(RU_ID);
      assertThat(captured.getBlockId()).isNull(); // XOR subject check
      assertThat(captured.getStatus()).isEqualTo("SUBMITTED");
    }
  }
}
