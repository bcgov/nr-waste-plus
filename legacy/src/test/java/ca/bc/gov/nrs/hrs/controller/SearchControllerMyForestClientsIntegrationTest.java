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
@DisplayName("Integrated Test | Search Endpoint : My Forest Clients")
@WithMockJwt(
    cognitoGroups = {"Submitter_00010004"}
)
class SearchControllerMyForestClientsIntegrationTest extends
    AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Should search my forest clients")
  void shouldSearchMyForestClients() throws Exception {
    mockMvc
        .perform(
            get("/api/search/my-forest-clients")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content[0].submissionsCount").value(2))
        .andExpect(jsonPath("$.content[0].client.code").value("00010004"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andReturn();
  }

  @Test
  @DisplayName("Should search my forest clients other page")
  void shouldSearchMyForestClientsOtherPage() throws Exception {
    mockMvc
        .perform(
            get("/api/search/my-forest-clients")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "3")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andReturn();
  }

  @Test
  @DisplayName("Should search my forest clients with ids valid")
  void shouldSearchMyForestClientsWithIdsValid() throws Exception {
    mockMvc
        .perform(
            get("/api/search/my-forest-clients")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .queryParam("values","00010004")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content[0].submissionsCount").value(2))
        .andExpect(jsonPath("$.content[0].client.code").value("00010004"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(1))
        .andReturn();
  }

  @Test
  @DisplayName("Should search my forest clients with ids invalid")
  void shouldSearchMyForestClientsWithIdsInValid() throws Exception {
    mockMvc
        .perform(
            get("/api/search/my-forest-clients")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .queryParam("values","00040004")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(0))
        .andReturn();
  }

}
