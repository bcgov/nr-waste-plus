package ca.bc.gov.nrs.hrs.endpoint;

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
@DisplayName("Integrated Test | Search Endpoint : Reporting Unit as Users")
@WithMockJwt(
    cognitoGroups = {"Submitter_00010002","Viewer"}
)
class SearchEndpointReportingUnitUsersIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("List ru users that matches jake")
  void shouldListReportingUnitsUsersFromJake() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units-users")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("userId", "jake")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$.[0]").value("BCEID\\JAKE"))
        .andExpect(jsonPath("$.[1]").value("IDIR\\JAKE"))
        .andReturn();
  }

  @Test
  @DisplayName("Jonny can't be found")
  void shouldSearchRuUsersAndFoundNothing() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units-users")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("userId", "jonny")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.length()").value(0))
        .andReturn();
  }

  @Test
  @DisplayName("Lump Space Princess, I can see you")
  void shouldReturnIfIdir() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units-users")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("userId", "lsp")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.length()").value(1))
        .andReturn();
  }

  @Test
  @DisplayName("Lump Space Princess, where are you?")
  @WithMockJwt(
      cognitoGroups = {"Submitter_00010002","Viewer"},
      idp = "bceidbusiness"
  )
  void shouldReturnNothingWhenClientNotListed() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units-users")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("userId", "lsp")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.length()").value(0))
        .andReturn();
  }
}
