package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventRequestDto;
import ca.bc.gov.nrs.hrs.dto.block.LifecycleEventResponseDto;
import ca.bc.gov.nrs.hrs.exception.BlockNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ConditionalRequestException;
import ca.bc.gov.nrs.hrs.exception.GlobalExceptionHandler;
import ca.bc.gov.nrs.hrs.exception.IllegalTransitionException;
import ca.bc.gov.nrs.hrs.exception.ReportingUnitNotFoundException;
import ca.bc.gov.nrs.hrs.exception.ValidationProblemDetailsExceptionHandler;
import ca.bc.gov.nrs.hrs.service.lifecycle.LifecycleEventService;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
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

  @InjectMocks
  private LifecycleEventController lifecycleEventController;

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
        new LifecycleEventResponseDto(RU_ID, BLOCK_ID, "DRAFT", "SUBMITTED", "SUBMIT", 15L, occurredAt);

    when(lifecycleEventService.recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class)))
        .thenReturn(responseDto);

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
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
  }

  @Test
  @DisplayName("POST /{ruId}/blocks/{blockId}/lifecycle-events returns 200 with alias path")
  void submitBlockLifecycleEvent_blocksAliasPath_returnsOk() throws Exception {
    Instant occurredAt = Instant.parse("2026-08-24T12:00:00Z");
    LifecycleEventResponseDto responseDto =
        new LifecycleEventResponseDto(RU_ID, BLOCK_ID, "DRAFT", "SUBMITTED", "SUBMIT", 15L, occurredAt);

    when(lifecycleEventService.recordBlockLifecycleEvent(
            any(), isNull(), eq(RU_ID), eq(BLOCK_ID), any(LifecycleEventRequestDto.class)))
        .thenReturn(responseDto);

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/blocks/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": "Ready for review" }
                    """))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ETAG, "\"15\""))
        .andExpect(jsonPath("$.state").value("SUBMITTED"));
  }

  @Test
  @DisplayName("POST /{ruId}/lifecycle-events returns 200 for reporting-unit scoped transition")
  void submitReportingUnitLifecycleEvent_returnsOkWithETag() throws Exception {
    Instant occurredAt = Instant.parse("2026-08-24T12:00:00Z");
    LifecycleEventResponseDto responseDto =
        new LifecycleEventResponseDto(RU_ID, null, "SUBMISSION", "SUBMITTED", "SUBMIT", 8L, occurredAt);

    when(lifecycleEventService.recordReportingUnitLifecycleEvent(
            any(), isNull(), eq(RU_ID), any(LifecycleEventRequestDto.class)))
        .thenReturn(responseDto);

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/lifecycle-events", RU_ID)
                .contentType(MediaType.APPLICATION_JSON)
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
  }

  @Test
  @DisplayName("Missing event in payload returns 422 Unprocessable Content")
  void submit_missingEvent_returns422() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "", "comment": "Empty event" }
                    """))
        .andExpect(status().isUnprocessableEntity());
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
        .thenThrow(new IllegalTransitionException("Illegal transition: event SUBMIT is not permitted from SUBMITTED"));

    mockMvc
        .perform(
            post("/api/reporting-units/{ruId}/{blockId}/lifecycle-events", RU_ID, BLOCK_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.IF_MATCH, "\"14\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isConflict());
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
                .header(HttpHeaders.IF_MATCH, "\"7\"")
                .content("""
                    { "event": "SUBMIT", "comment": null }
                    """))
        .andExpect(status().isNotFound());
  }
}
