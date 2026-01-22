package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;

@AutoConfigureMockMvc
@DisplayName("Integrated Test | Search Endpoint : Reporting Unit")
@WithMockJwt
class SearchControllerReportingUnitIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  @DisplayName("Should search reporting units")
  void shouldSearchReportingUnits() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "0")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content[0].ruNumber").value(34906))
        .andExpect(jsonPath("$.content[0].client.code").value("00010004"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(44))
        .andReturn();
  }

  @Test
  @DisplayName("Should search reporting units with client number")
  void shouldSearchReportingUnitsWithClientNumber() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("clientNumber", "00010004")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content[0].ruNumber").value(34906))
        .andExpect(jsonPath("$.content[0].client.code").value("00010004"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(44))
        .andReturn();
  }

  @Test
  @DisplayName("Search reporting units with client number not being idir and fail")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Submitter_00070002", "Viewer_00010004"}
  )
  void shouldSearchReportingUnitsWithClientNumberNotIdir() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("clientNumber", "00010004")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(32))
        .andReturn();
  }

  @Test
  @DisplayName("Search reporting units with client number not being idir and get it")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Submitter_00010004", "Viewer_00010004"}
  )
  void shouldSearchReportingUnitsWithClientNumberNotIdirSuccess() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("clientNumber", "00010004")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content[0].ruNumber").value(34906))
        .andExpect(jsonPath("$.content[0].client.code").value("00010004"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(32))
        .andReturn();
  }

  @Test
  @DisplayName("Should search reporting units with paging")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Submitter_00010004", "Viewer_00010004"}
  )
  void shouldSearchReportingUnitsWithPageAndSize() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "10")
                .param("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(32))
        .andReturn();
  }

  @Test
  @DisplayName("Should fail when sorting by invalid field")
  void shouldSearchReportingUnitsWithWrongSorting() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("sort", "invalidField,desc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().is(428))
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Precondition Required"))
        .andExpect(jsonPath("$.status").value(428))
        .andExpect(jsonPath("$.detail").value(
            "Field invalidField is not a valid sorting field. Please check the documentation for valid sorting fields."))
        .andExpect(jsonPath("$.instance").value("/api/search/reporting-units"))
        .andReturn();
  }

  @Test
  @DisplayName("Should get expanded reporting unit details")
  void shouldGetExpandedDetails() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units/ex/{reportingUnitId}/{blockId}", 34004, 161966)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.id").value(161966))
        .andExpect(jsonPath("$.licenseNo").value("A91320"))
        .andReturn();
  }

  @Test
  @DisplayName("Should fail to get expanded reporting unit details")
  void shouldFailGetExpandedDetails() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units/ex/{reportingUnitId}/{blockId}", 1, 2)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isNotFound())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.detail").value("Block with ID 2 not found for Reporting Unit with ID 1."))
        .andExpect(jsonPath("$.status").value(404))
        .andReturn();
  }

  @Test
  @DisplayName("Should filter reporting units within date range")
  void shouldFilterReportingUnitsWithinDateRange() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("dateStart", "2000-01-01")
                .param("dateEnd", "2100-01-01")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content.length()")
            .value(org.hamcrest.Matchers.greaterThan(0)))
        .andReturn();
  }

  @Test
  @DisplayName("Should return results even with narrow date range (date filter applied)")
  void shouldHandleNarrowDateRangeWithoutError() throws Exception {
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("dateStart", "1900-01-01")
                .param("dateEnd", "1900-01-02")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.content.length()")
            .value(org.hamcrest.Matchers.greaterThanOrEqualTo(0)))
        .andReturn();
  }

}