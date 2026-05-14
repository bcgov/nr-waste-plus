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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("Integrated Test | Reporting Unit Details Endpoint")
@WithMockJwt
class ReportingUnitControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  // -----------------------------------------------------------------------
  // GET /api/reporting-units/{id} — happy path (IDIR, unrestricted)
  // -----------------------------------------------------------------------

  @Test
  @DisplayName("should return reporting unit details for an existing RU when user is IDIR")
  void shouldReturnReportingUnitDetails_whenIdirUserAndRuExists() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 879)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.clientNumber").value("00001271"))
        .andExpect(jsonPath("$.clientLocnCode").value("00"))
        .andExpect(jsonPath("$.sampling.code").value("AGR"))
        .andExpect(jsonPath("$.district.code").value("DSS"))
        .andReturn();
  }

  @Test
  @DisplayName("should return 404 when the reporting unit does not exist")
  void shouldReturn404_whenReportingUnitNotFound() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 999999999)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andReturn();
  }

  // -----------------------------------------------------------------------
  // GET /api/reporting-units/{id} — non-IDIR with matching client
  // -----------------------------------------------------------------------

  @Test
  @DisplayName("should return reporting unit details when non-IDIR user has matching client number")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Submitter_00001271"}
  )
  void shouldReturnReportingUnitDetails_whenBceidUserHasMatchingClient() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 879)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.clientNumber").value("00001271"))
        .andReturn();
  }

  @Test
  @DisplayName("should return 404 when non-IDIR user does not have the matching client")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Submitter_00099999"}
  )
  void shouldReturn404_whenBceidUserLacksMatchingClient() throws Exception {
    mockMvc
        .perform(
            get("/api/reporting-units/{id}", 879)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andReturn();
  }

}

