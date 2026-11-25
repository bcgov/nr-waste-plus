package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.block.AvailableLifecycleEventDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleDetailsDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventRequestDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventResponseDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleHistoryItemDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleViewResult;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ConditionalRequestException;
import ca.bc.gov.nrs.hrs.exception.GlobalExceptionHandler;
import ca.bc.gov.nrs.hrs.exception.IllegalTransitionException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ValidationProblemDetailsExceptionHandler;
import ca.bc.gov.nrs.hrs.security.ResourceScopeGuard;
import ca.bc.gov.nrs.hrs.service.lifecycle.LifecycleEventService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Lifecycle Event Controller")
class LifecycleEventControllerTest {

  private static final Long RU_ID = 37870L;
  private static final Long BLOCK_ID = 12345L;

  private MockMvc mockMvc;

  @Mock
  private LifecycleEventService lifecycleEventService;

  @Mock
  private ResourceScopeGuard resourceScopeGuard;

  @InjectMocks
  private LifecycleEventController lifecycleEventController;

  private static final String IDEMPOTENCY_KEY = "test-idempotency-key";

  @BeforeEach
  void setUp() {
    JsonMapper objectMapper =
        JsonMapper.builder()
            .findAndAddModules()
            .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
            .build();

    this.mockMvc =
        MockMvcBuilders.standaloneSetup(lifecycleEventController)
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
            .setControllerAdvice(
                new ValidationProblemDetailsExceptionHandler(), new GlobalExceptionHandler())
            .setMessageConverters(new JacksonJsonHttpMessageConverter(objectMapper))
            .build();
  }

  @Test
  @DisplayName("POST /{ruId}/{blockId}/lifecycle-events returns 200 with response body and ETag")
  void submitBlockLifecycleEvent_returnsOkWithETag() throws Exception {
    Instant occurredAt = Instant.parse("2026-08-24T12:00:00Z");
    LifecycleEventResponseDto responseDto =
        new LifecycleEventResponseDto(
            RU_ID, BLOCK_ID, "DRAFT", "SUBMITTED", "SUBMIT", 15L, occurredAt);

    when(lifecycleEventService.recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class)))
        .thenReturn(responseDto);

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"15\""))
        .andExpect(jsonPath("$.reportingUnitId").value(RU_ID))
        .andExpect(jsonPath("$.blockId").value(BLOCK_ID))
        .andExpect(jsonPath("$.previousState").value("DRAFT"))
        .andExpect(jsonPath("$.state").value("SUBMITTED"))
        .andExpect(jsonPath("$.event").value("SUBMIT"))
        .andExpect(jsonPath("$.version").value(15));

    verify(lifecycleEventService)
        .recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class));
    verify(resourceScopeGuard).verify(isNull(Jwt.class), eq(RU_ID), eq("POST"));
  }

  @Test
  @DisplayName("POST /{ruId}/lifecycle-events returns 200 for reporting-unit scoped transition")
  void submitReportingUnitLifecycleEvent_returnsOkWithETag() throws Exception {
    Instant occurredAt = Instant.parse("2026-08-24T12:00:00Z");
    LifecycleEventResponseDto responseDto =
        new LifecycleEventResponseDto(
            RU_ID, null, "SUBMISSION", "SUBMITTED", "SUBMIT", 8L, occurredAt);

    when(lifecycleEventService.recordReportingUnitLifecycleEvent(
            any(), isNull(), eq(RU_ID), any(LifecycleEventRequestDto.class)))
        .thenReturn(responseDto);

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/lifecycle-events", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .header(HttpHeaders.IF_MATCH, "\"7\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"8\""))
        .andExpect(jsonPath("$.reportingUnitId").value(RU_ID))
        .andExpect(jsonPath("$.blockId").doesNotExist())
        .andExpect(jsonPath("$.state").value("SUBMITTED"))
        .andExpect(jsonPath("$.version").value(8));

    verify(resourceScopeGuard).verify(isNull(Jwt.class), eq(RU_ID), eq("POST"));
  }

  @Test
  @DisplayName("Missing event in payload returns 422 Unprocessable Content")
  void submit_missingEvent_returns422() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "", "comment": "Empty event" }
                    """))
        .andExpect(status().isUnprocessableEntity());
  }

  @Test
  @DisplayName("Missing Idempotency-Key header returns 400 Bad Request")
  void submit_missingIdempotencyKey_returns400() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Blank Idempotency-Key header returns 400 Bad Request")
  void submit_blankIdempotencyKey_returns400() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", "   ")
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("Stale or missing ETag returns 412 Precondition Failed")
  void submit_staleETag_returns412() throws Exception {
    when(lifecycleEventService.recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class)))
        .thenThrow(new ConditionalRequestException());

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isPreconditionFailed());
  }

  @Test
  @DisplayName("Illegal transition returns 409 Conflict")
  void submit_illegalTransition_returns409() throws Exception {
    when(lifecycleEventService.recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class)))
        .thenThrow(
            new IllegalTransitionException(
                "Illegal transition: event SUBMIT is not permitted from SUBMITTED"));

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("Forbidden role returns 403 Forbidden")
  void submit_forbiddenRole_returns403() throws Exception {
    when(lifecycleEventService.recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class)))
        .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Viewer role is read-only"));

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Unknown block returns 404 Not Found")
  void submit_unknownBlock_returns404() throws Exception {
    when(lifecycleEventService.recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class)))
        .thenThrow(new BlockNotFoundException(BLOCK_ID, RU_ID));

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("Unknown reporting unit returns 404 Not Found")
  void submit_unknownRU_returns404() throws Exception {
    when(lifecycleEventService.recordReportingUnitLifecycleEvent(
            any(), isNull(), eq(RU_ID), any(LifecycleEventRequestDto.class)))
        .thenThrow(new ReportingUnitNotFoundException(RU_ID));

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/lifecycle-events", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Idempotency-Key", IDEMPOTENCY_KEY)
                .header(HttpHeaders.IF_MATCH, "\"7\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("GET /{ruId}/{blockId}/lifecycle returns 200 with details and ETag")
  void getBlockLifecycle_returnsOkWithETag() throws Exception {
    AvailableLifecycleEventDto approveEvent =
        new AvailableLifecycleEventDto("APPROVE", "Approve submission", false, true);
    AvailableLifecycleEventDto rejectEvent =
        new AvailableLifecycleEventDto("REJECT", "Reject submission", true, true);
    LifecycleHistoryItemDto historyItem =
        new LifecycleHistoryItemDto(
            901L, "SUBMIT", "DRAFT", "SUBMITTED", "idir\\jdoe",
            Instant.parse("2026-08-24T12:00:00Z"), null);

    LifecycleDetailsDto detailsDto =
        new LifecycleDetailsDto("SUBMITTED", List.of(approveEvent, rejectEvent), List.of(historyItem));
    LifecycleViewResult viewResult = new LifecycleViewResult(detailsDto, 15L);

    when(lifecycleEventService.viewBlockLifecycle(isNull(), eq(RU_ID), eq(BLOCK_ID)))
        .thenReturn(viewResult);

    mockMvc
        .perform(get("/api/reporting-units/{ruId}/{blockId}/lifecycle", RU_ID, BLOCK_ID))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"15\""))
        .andExpect(jsonPath("$.state").value("SUBMITTED"))
        .andExpect(jsonPath("$.availableEvents").isArray())
        .andExpect(jsonPath("$.availableEvents[0].event").value("APPROVE"))
        .andExpect(jsonPath("$.availableEvents[0].label").value("Approve submission"))
        .andExpect(jsonPath("$.availableEvents[0].commentRequired").value(false))
        .andExpect(jsonPath("$.availableEvents[0].confirmationRequired").value(true))
        .andExpect(jsonPath("$.availableEvents[1].event").value("REJECT"))
        .andExpect(jsonPath("$.availableEvents[1].commentRequired").value(true))
        .andExpect(jsonPath("$.history").isArray())
        .andExpect(jsonPath("$.history[0].statusEventId").value(901))
        .andExpect(jsonPath("$.history[0].event").value("SUBMIT"))
        .andExpect(jsonPath("$.history[0].fromState").value("DRAFT"))
        .andExpect(jsonPath("$.history[0].toState").value("SUBMITTED"))
        .andExpect(jsonPath("$.history[0].actor").value("idir\\jdoe"));

    verify(resourceScopeGuard).verify(isNull(Jwt.class), eq(RU_ID), eq("GET"));
  }

  @Test
  @DisplayName("GET /{ruId}/lifecycle returns 200 with reporting unit details and ETag")
  void getReportingUnitLifecycle_returnsOkWithETag() throws Exception {
    AvailableLifecycleEventDto submitEvent =
        new AvailableLifecycleEventDto("SUBMIT", "Submit", false, false);
    LifecycleDetailsDto detailsDto =
        new LifecycleDetailsDto("SUBMISSION", List.of(submitEvent), List.of());
    LifecycleViewResult viewResult = new LifecycleViewResult(detailsDto, 10L);

    when(lifecycleEventService.viewReportingUnitLifecycle(isNull(), eq(RU_ID)))
        .thenReturn(viewResult);

    mockMvc
        .perform(get("/api/reporting-units/{ruId}/lifecycle", RU_ID))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"10\""))
        .andExpect(jsonPath("$.state").value("SUBMISSION"))
        .andExpect(jsonPath("$.availableEvents[0].event").value("SUBMIT"))
        .andExpect(jsonPath("$.history").isEmpty());

    verify(resourceScopeGuard).verify(isNull(Jwt.class), eq(RU_ID), eq("GET"));
  }
}
