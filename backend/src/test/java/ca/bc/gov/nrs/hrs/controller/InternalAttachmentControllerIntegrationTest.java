package ca.bc.gov.nrs.hrs.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.block.AttachmentScanStatus;
import ca.bc.gov.nrs.hrs.entity.block.BlockAttachmentEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.service.block.AttachmentScanService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Internal Attachment Controller")
class InternalAttachmentControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private AttachmentScanService scanService;

  @Test
  @DisplayName("PATCH /scan-status returns 401 Unauthorized when unauthenticated")
  void updateScanStatus_whenUnauthenticated_returns401() throws Exception {
    mockMvc
        .perform(
            patch("/api/internal/attachments/501/scan-status")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scanStatus\":\"CLEAN\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("PATCH /scan-status returns 403 Forbidden for submitter role")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_SUBMITTER_00012797"})
  void updateScanStatus_whenSubmitter_returns403() throws Exception {
    mockMvc
        .perform(
            patch("/api/internal/attachments/501/scan-status")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scanStatus\":\"CLEAN\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("PATCH /scan-status returns 403 Forbidden for viewer role")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_VIEWER_00012797"})
  void updateScanStatus_whenViewer_returns403() throws Exception {
    mockMvc
        .perform(
            patch("/api/internal/attachments/501/scan-status")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scanStatus\":\"CLEAN\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("PATCH /scan-status returns 200 OK for admin role")
  @WithMockJwt(cognitoGroups = {"WASTE_PLUS_ADMIN"})
  void updateScanStatus_whenAdmin_returnsOk() throws Exception {
    BlockAttachmentEntity entity = new BlockAttachmentEntity();
    entity.setId(501L);
    entity.setScanStatus(AttachmentScanStatus.CLEAN.name());

    when(scanService.updateScanStatus(eq(501L), eq(AttachmentScanStatus.CLEAN)))
        .thenReturn(entity);

    mockMvc
        .perform(
            patch("/api/internal/attachments/501/scan-status")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"scanStatus\":\"CLEAN\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.attachmentId").value(501))
        .andExpect(jsonPath("$.scanStatus").value("CLEAN"));
  }
}
