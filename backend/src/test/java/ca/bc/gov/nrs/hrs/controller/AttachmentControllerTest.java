package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentDownloadResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentFinalizeResponse;
import ca.bc.gov.nrs.hrs.dto.block.AttachmentIntentResponse;
import ca.bc.gov.nrs.hrs.exception.AttachmentConflictException;
import ca.bc.gov.nrs.hrs.exception.AttachmentNotFoundException;
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
  @DisplayName("POST /attempt returns 201 with presigned upload URL")
  void createAttempt_returnsCreatedWithPresignedUrl() throws Exception {
    Instant expiresAt = Instant.parse("2026-01-01T00:05:00Z");
    when(attachmentService.createAttempt(nullable(Jwt.class), eq(1L), eq(2L), any()))
        .thenReturn(
            new AttachmentIntentResponse(
                501L,
                "hrs/staging/block/2/attachment/501/final-map.pdf",
                "https://s3.example.com/hrs/staging/block/2/attachment/501/final-map.pdf?signature=xyz",
                expiresAt));

    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/attempt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"FINAL_MAP\",\"fileName\":\"final map.pdf\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":1024}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.attachmentId").value(501))
        .andExpect(jsonPath("$.objectKey").value("hrs/staging/block/2/attachment/501/final-map.pdf"))
        .andExpect(
            jsonPath("$.uploadUrl")
                .value(
                    "https://s3.example.com/hrs/staging/block/2/attachment/501/final-map.pdf?signature=xyz"))
        .andExpect(jsonPath("$.expiresAt").value("2026-01-01T00:05:00Z"));
  }

  @Test
  @DisplayName("POST /attempt returns 413 when declared size exceeds maximum")
  void createAttempt_whenOversized_returns413() throws Exception {
    when(attachmentService.createAttempt(nullable(Jwt.class), eq(1L), eq(2L), any()))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.CONTENT_TOO_LARGE, "Declared size exceeds maximum"));

    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/attempt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"FINAL_MAP\",\"fileName\":\"huge.pdf\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":999999999}"))
        .andExpect(status().isPayloadTooLarge());
  }

  @Test
  @DisplayName("POST /attempt returns 400 when documentType is invalid")
  void createAttempt_whenInvalidDocumentType_returns400() throws Exception {
    when(attachmentService.createAttempt(nullable(Jwt.class), eq(1L), eq(2L), any()))
        .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid documentType"));

    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/attempt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"INVALID_TYPE\",\"fileName\":\"map.pdf\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":1024}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /attempt returns 400 when required fields are missing")
  void createAttempt_whenMissingRequiredField_returns400() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/1/2/attachments/attempt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"FINAL_MAP\",\"fileName\":\"\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":1024}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST /{attachmentId}/finalize returns 200 with checksum")
  void finalizeAttachment_returnsOkWithChecksum() throws Exception {
    when(attachmentService.finalizeAttachment(nullable(Jwt.class), eq(1L), eq(2L), eq(501L)))
        .thenReturn(
            new AttachmentFinalizeResponse(
                501L,
                "hrs/block/2/attachment/501/final-map.pdf",
                "FINALIZED",
                "d41d8cd98f00b204e9800998ecf8427e"));

    mockMvc
        .perform(post("/api/reporting-units/1/2/attachments/501/finalize"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.attachmentId").value(501))
        .andExpect(jsonPath("$.status").value("FINALIZED"))
        .andExpect(jsonPath("$.checksum").value("d41d8cd98f00b204e9800998ecf8427e"));
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

  @Test
  @DisplayName("GET /{attachmentId}/download returns 200 with presigned download URL")
  void getDownloadUrl_whenClean_returnsOkWithPresignedUrl() throws Exception {
    Instant expiresAt = Instant.parse("2026-01-01T00:05:00Z");
    when(attachmentService.getDownloadUrl(nullable(Jwt.class), eq(1L), eq(2L), eq(501L)))
        .thenReturn(
            new AttachmentDownloadResponse(
                501L,
                "final-map.pdf",
                "application/pdf",
                1024L,
                "https://s3.example.com/download?sig=abc",
                expiresAt));

    mockMvc
        .perform(get("/api/reporting-units/1/2/attachments/501/download"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.attachmentId").value(501))
        .andExpect(jsonPath("$.fileName").value("final-map.pdf"))
        .andExpect(jsonPath("$.contentType").value("application/pdf"))
        .andExpect(jsonPath("$.fileSizeBytes").value(1024))
        .andExpect(jsonPath("$.downloadUrl").value("https://s3.example.com/download?sig=abc"))
        .andExpect(jsonPath("$.expiresAt").value("2026-01-01T00:05:00Z"));
  }

  @Test
  @DisplayName("GET /{attachmentId}/download returns 409 when attachment is quarantined")
  void getDownloadUrl_whenQuarantined_returns409() throws Exception {
    when(attachmentService.getDownloadUrl(nullable(Jwt.class), eq(1L), eq(2L), eq(501L)))
        .thenThrow(AttachmentConflictException.quarantined(501L));

    mockMvc
        .perform(get("/api/reporting-units/1/2/attachments/501/download"))
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("GET /{attachmentId}/download returns 409 when scan is pending")
  void getDownloadUrl_whenPending_returns409() throws Exception {
    when(attachmentService.getDownloadUrl(nullable(Jwt.class), eq(1L), eq(2L), eq(501L)))
        .thenThrow(AttachmentConflictException.scanPending(501L));

    mockMvc
        .perform(get("/api/reporting-units/1/2/attachments/501/download"))
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("GET /{attachmentId}/download returns 404 when attachment not found")
  void getDownloadUrl_whenNotFound_returns404() throws Exception {
    when(attachmentService.getDownloadUrl(nullable(Jwt.class), eq(1L), eq(2L), eq(999L)))
        .thenThrow(new AttachmentNotFoundException(999L));

    mockMvc
        .perform(get("/api/reporting-units/1/2/attachments/999/download"))
        .andExpect(status().isNotFound());
  }
}
