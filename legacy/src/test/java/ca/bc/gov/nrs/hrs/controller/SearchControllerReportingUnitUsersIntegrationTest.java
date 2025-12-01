package ca.bc.gov.nrs.hrs.controller;

import static ca.bc.gov.nrs.hrs.extensions.WithMockJwtSecurityContextFactory.createJwt;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Search Endpoint : Reporting Unit as Users")
@WithMockJwt(
    cognitoGroups = {"Submitter_00010002","Viewer"}
)
class SearchControllerReportingUnitUsersIntegrationTest extends AbstractTestContainerIntegrationTest {

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
                .with(jwt().jwt(
                    createJwt(
                        "test",
                        List.of("Submitter_00010002","Viewer"),
                        "idir",
                        "Test, Automated WLRS:EX",
                        "test@test.ca"
                    )
                ))
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$.[0]").value("IDIR\\JAKE"))
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
                .with(jwt().jwt(
                    createJwt(
                        "test",
                        List.of("Submitter_00010002","Viewer"),
                        "idir",
                        "Test, Automated WLRS:EX",
                        "test@test.ca"
                    )
                ))
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
                .with(jwt().jwt(
                    createJwt(
                        "test",
                        List.of("Submitter_00010002","Viewer"),
                        "idir",
                        "Test, Automated WLRS:EX",
                        "test@test.ca"
                    )
                ))
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
                .with(jwt().jwt(
                    createJwt(
                        "test",
                        List.of("Submitter_00010002","Viewer"),
                        "bceidbusiness",
                        "Test, Automated WLRS:EX",
                        "test@test.ca"
                    )
                ))
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.length()").value(0))
        .andReturn();
  }
}