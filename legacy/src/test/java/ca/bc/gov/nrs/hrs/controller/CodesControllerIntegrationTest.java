package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("Integrated Test | Codes Endpoint")
@WithMockJwt
class CodesControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Get districts")
  void getOpeningOrgUnits_happyPath_shouldSucceed() throws Exception {

    mockMvc
        .perform(
            get("/api/codes/districts")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$[0].code").value("DCC"))
        .andExpect(jsonPath("$[0].description").value("Cariboo-Chilcotin"))
        .andReturn();
  }

  @Test
  @DisplayName("Get samplings")
  void getSamplingCodes_happyPath_shouldSucceed() throws Exception {
    mockMvc
        .perform(
            get("/api/codes/samplings")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$[0].code").value("AGR"))
        .andExpect(jsonPath("$[0].description").value("Aggregate"))
        .andReturn();
  }

  @Test
  @DisplayName("Get statuses")
  void getStatusCodes_happyPath_shouldSucceed() throws Exception {
    mockMvc
        .perform(
            get("/api/codes/assess-area-statuses")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$[0].code").value("APP"))
        .andExpect(jsonPath("$[0].description").value("Approved"))
        .andReturn();
  }

}
