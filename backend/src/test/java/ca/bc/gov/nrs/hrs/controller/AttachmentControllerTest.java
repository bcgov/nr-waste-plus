package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentFinalizeResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentResponse;
import ca.bc.gov.nrs.hrs.service.block.AttachmentService;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
@DisplayName("Unit Test | Attachment Controller")
class AttachmentControllerTest {

  private MockMvc mockMvc;
  private JsonMapper objectMapper;

  @Mock
  private AttachmentService attachmentService;

  @InjectMocks
  private AttachmentController attachmentController;

  @BeforeEach
  void setUp() {
    this.objectMapper =
        JsonMapper.builder()
            .findAndAddModules()
            .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
            .build();
    this.mockMvc =
        MockMvcBuilders.standaloneSetup(attachmentController)
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
            .setMessageConverters(new JacksonJsonHttpMessageConverter(objectMapper))
            .build();
  }

  @Test
  @DisplayName("POST /intent returns 201 with presigned upload URL")
  void createIntent_returnsCreatedWithPresignedUrl() throws Exception {
    Instant expiresAt = Instant.parse("2026-01-01T00:05:00Z");
    when(attachmentService.createIntent(nullable(Jwt.class), eq(1L), eq(2L), any()))
        .thenReturn(
            new AttachmentIntentResponse(
                501L,
                "hrs/block/2/attachment/501/final_map.pdf",
                "https://s3.example.com/upload",
                expiresAt));

    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"FINAL_MAP\",\"fileName\":\"final map.pdf\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":1024}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.attachmentId").value(501))
        .andExpect(jsonPath("$.objectKey").value("hrs/block/2/attachment/501/final_map.pdf"))
        .andExpect(jsonPath("$.uploadUrl").value("https://s3.example.com/upload"))
        .andExpect(jsonPath("$.expiresAt").value("2026-01-01T00:05:00Z"));
  }

  @Test
  @DisplayName("POST /{attachmentId}/finalize returns 200 with finalized state")
  void finalizeAttachment_returnsOkWithFinalizedState() throws Exception {
    when(attachmentService.finalizeAttachment(nullable(Jwt.class), eq(1L), eq(2L), eq(501L)))
        .thenReturn(
            new AttachmentFinalizeResponse(
                501L, "hrs/block/2/attachment/501/final_map.pdf", "FINALIZED", "abc123"));

    mockMvc
        .perform(post("/api/reporting-units/1/2/attachments/501/finalize"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.attachmentId").value(501))
        .andExpect(jsonPath("$.status").value("FINALIZED"))
        .andExpect(jsonPath("$.checksum").value("abc123"));
  }

  @Test
  @DisplayName("POST /intent returns 413 when declared size exceeds maximum")
  void createIntent_whenOversized_returns413() throws Exception {
    when(attachmentService.createIntent(nullable(Jwt.class), eq(1L), eq(2L), any()))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.PAYLOAD_TOO_LARGE, "Declared size exceeds maximum"));

    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"FINAL_MAP\",\"fileName\":\"huge.pdf\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":6000000}"))
        .andExpect(status().isPayloadTooLarge());
  }

  @Test
  @DisplayName("POST /intent returns 400 when documentType is invalid")
  void createIntent_whenInvalidDocumentType_returns400() throws Exception {
    when(attachmentService.createIntent(nullable(Jwt.class), eq(1L), eq(2L), any()))
        .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid documentType"));

    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"INVALID_TYPE\",\"fileName\":\"map.pdf\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":1024}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /intent returns 400 when required fields are missing")
  void createIntent_whenMissingRequiredField_returns400() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"FINAL_MAP\",\"fileName\":\"\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":1024}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /{attachmentId}/finalize returns 404 when attachment not found")
  void finalizeAttachment_whenNotFound_returns404() throws Exception {
    when(attachmentService.finalizeAttachment(nullable(Jwt.class), eq(1L), eq(2L), eq(999L)))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Attachment intent not found"));

    mockMvc
        .perform(post("/api/reporting-units/1/2/attachments/999/finalize"))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("POST /{attachmentId}/finalize returns 409 on object missing or checksum mismatch")
  void finalizeAttachment_whenConflict_returns409() throws Exception {
    when(attachmentService.finalizeAttachment(nullable(Jwt.class), eq(1L), eq(2L), eq(501L)))
        .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Checksum mismatch"));

    mockMvc
        .perform(post("/api/reporting-units/1/2/attachments/501/finalize"))
        .andExpect(status().isConflict());
  }
}
