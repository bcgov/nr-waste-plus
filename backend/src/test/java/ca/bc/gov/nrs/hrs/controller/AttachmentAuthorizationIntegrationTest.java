package ca.bc.gov.nrs.hrs.controller;

import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.provider.objectstorage.ObjectStorageProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Attachment authorization")
class AttachmentAuthorizationIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private ObjectStorageProvider objectStorageProvider;

  @Test
  @WithMockJwt(idp = "bcsc")
  @DisplayName("BCSC cannot create an attachment attempt")
  void createAttempt_bcsc_returns403WithoutStorageOrPersistence() throws Exception {
    mockMvc
        .perform(
            post("/api/reporting-units/123/456/attachments/attempt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"documentType\":\"FINAL_MAP\",\"fileName\":\"map.pdf\","
                        + "\"mimeType\":\"application/pdf\",\"declaredSizeBytes\":1024}"))
        .andExpect(status().isForbidden())
        .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("FOREIGN"))));

    org.mockito.Mockito.verifyNoInteractions(objectStorageProvider);
  }

  @Test
  @WithMockJwt(idp = "bcsc")
  @DisplayName("BCSC cannot finalize an attachment")
  void finalizeAttachment_bcsc_returns403WithoutStorageOrPersistence() throws Exception {
    mockMvc
        .perform(post("/api/reporting-units/123/456/attachments/789/finalize"))
        .andExpect(status().isForbidden())
        .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("FOREIGN"))));

    org.mockito.Mockito.verifyNoInteractions(objectStorageProvider);
  }
}
