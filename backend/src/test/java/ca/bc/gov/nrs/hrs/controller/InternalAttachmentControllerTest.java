package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.exception.AttachmentConflictException;
import ca.bc.gov.nrs.hrs.exception.AttachmentNotFoundException;
import ca.bc.gov.nrs.hrs.service.block.AttachmentScanService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | Internal Attachment Controller")
class InternalAttachmentControllerTest {

  private MockMvc mockMvc;

  @Mock
  private AttachmentScanService scanService;

  @InjectMocks
  private InternalAttachmentController internalAttachmentController;

  @BeforeEach
  void setUp() {
    JsonMapper objectMapper =
        JsonMapper.builder()
            .findAndAddModules()
            .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
            .build();

    this.mockMvc =
        MockMvcBuilders.standaloneSetup(internalAttachmentController)
            .setMessageConverters(new JacksonJsonHttpMessageConverter(objectMapper))
            .build();
  }

  @Test
  @DisplayName("PATCH /{attachmentId}/scan-status returns 200 with updated scan status")
  void updateScanStatus_patch_returnsOk() throws Exception {
    BlockAttachmentEntity entity = new BlockAttachmentEntity();
    entity.setId(501L);
    entity.setScanStatus(AttachmentScanStatus.CLEAN.name());

    when(scanService.updateScanStatus(501L, AttachmentScanStatus.CLEAN)).thenReturn(entity);

    mockMvc
        .perform(
            patch("/api/internal/attachments/501/scan-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scanStatus\":\"CLEAN\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.attachmentId").value(501))
        .andExpect(jsonPath("$.scanStatus").value("CLEAN"));
  }

  @Test
  @DisplayName("PATCH /{attachmentId}/scan-status returns 409 on invalid state transition")
  void updateScanStatus_whenInvalidTransition_returns409() throws Exception {
    when(scanService.updateScanStatus(501L, AttachmentScanStatus.CLEAN))
        .thenThrow(
            AttachmentConflictException.invalidScanStatusTransition(
                AttachmentScanStatus.QUARANTINED, AttachmentScanStatus.CLEAN));

    mockMvc
        .perform(
            patch("/api/internal/attachments/501/scan-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scanStatus\":\"CLEAN\"}"))
        .andExpect(status().isConflict());
  }

  @Test
  @DisplayName("PATCH /{attachmentId}/scan-status returns 404 when attachment not found")
  void updateScanStatus_whenNotFound_returns404() throws Exception {
    when(scanService.updateScanStatus(999L, AttachmentScanStatus.CLEAN))
        .thenThrow(new AttachmentNotFoundException(999L));

    mockMvc
        .perform(
            patch("/api/internal/attachments/999/scan-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scanStatus\":\"CLEAN\"}"))
        .andExpect(status().isNotFound());
  }

  @Test
  @DisplayName("PATCH /{attachmentId}/scan-status returns 400 when scanStatus is missing")
  void updateScanStatus_whenMissingBody_returns400() throws Exception {
    mockMvc
        .perform(
            patch("/api/internal/attachments/501/scan-status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());
  }
}

