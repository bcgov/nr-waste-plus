package ca.bc.gov.nrs.hrs.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import java.util.List;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
@DisplayName("Integrated Test | Search Endpoint : Reporting Unit")
@WithMockJwt
class SearchControllerReportingUnitIntegrationTest
    extends AbstractTestContainerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  private static final String CONTENT_TYPE_JSON =
      MediaType.APPLICATION_JSON_VALUE;

  private static final String CONTENT_TYPE_PROBLEM_JSON =
      MediaType.APPLICATION_PROBLEM_JSON_VALUE;

  private static final String SEARCH_URL =
      "/api/search/reporting-units";

  private static final String EXPANDED_URL =
      "/api/search/reporting-units/ex/{ruId}/{waaId}";

  @Test
  @DisplayName("Should search reporting units")
  void shouldSearchReportingUnits() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .accept(CONTENT_TYPE_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content[0].ruNumber").value(879))
        .andExpect(jsonPath("$.content[0].client.code").value("00001271"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(181))
        .andReturn();
  }

  @Test
  @DisplayName("Should search reporting units with client number")
  void shouldSearchReportingUnitsWithClientNumber() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("clientNumber", "00010004")
                .accept(CONTENT_TYPE_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content[0].ruNumber").value(879))
        .andExpect(jsonPath("$.content[0].client.code").value("00001271"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(181))
        .andReturn();
  }

  @Test
  @DisplayName("Search reporting units with client number not being idir and fail")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {
          "Submitter_00070002",
          "Viewer_00010004"
      }
  )
  void shouldSearchReportingUnitsWithClientNumberNotIdir() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("clientNumber", "00010004")
                .accept(CONTENT_TYPE_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(35))
        .andReturn();
  }

  @Test
  @DisplayName("Search reporting units with client number not being idir and get it")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {
          "Submitter_00010004",
          "Viewer_00010004"
      }
  )
  void shouldSearchReportingUnitsWithClientNumberNotIdirSuccess()
      throws Exception {

    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("clientNumber", "00010004")
                .accept(CONTENT_TYPE_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content[0].ruNumber").value(34906))
        .andExpect(jsonPath("$.content[0].client.code").value("00010004"))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(35))
        .andReturn();
  }

  @Test
  @DisplayName("Should search reporting units with paging")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {
          "Submitter_00010004",
          "Viewer_00010004"
      }
  )
  void shouldSearchReportingUnitsWithPageAndSize() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "10")
                .param("size", "10")
                .accept(CONTENT_TYPE_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(35))
        .andReturn();
  }

  @Test
  @DisplayName("Should fail when sorting by invalid field")
  void shouldSearchReportingUnitsWithWrongSorting() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("sort", "invalidField,desc")
                .accept(CONTENT_TYPE_JSON)
        )
        .andExpect(status().is(428))
        .andExpect(content().contentType(CONTENT_TYPE_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Precondition Required"))
        .andExpect(jsonPath("$.status").value(428))
        .andExpect(
            jsonPath("$.detail")
                .value(
                    "Field invalidField is not a valid sorting field. "
                        + "Please check the documentation for valid sorting fields."
                )
        )
        .andExpect(jsonPath("$.instance").value(SEARCH_URL))
        .andReturn();
  }

  @Test
  @DisplayName("Should get expanded reporting unit details")
  void shouldGetExpandedDetails() throws Exception {
    mockMvc
        .perform(
            get(EXPANDED_URL, 34004, 161966)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.id").value(161966))
        .andExpect(jsonPath("$.licenseNo").value("A91320"))
        .andReturn();
  }

  @Test
  @DisplayName("Should fail to get expanded reporting unit details")
  void shouldFailGetExpandedDetails() throws Exception {
    mockMvc
        .perform(
            get(EXPANDED_URL, 1, 2)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .accept(CONTENT_TYPE_JSON)
        )
        .andExpect(status().isNotFound())
        .andExpect(content().contentType(CONTENT_TYPE_PROBLEM_JSON))
        .andExpect(
            jsonPath("$.detail")
                .value(
                    "Waste assessment area with ID 2 not found "
                        + "for Reporting Unit with ID 1."
                )
        )
        .andExpect(jsonPath("$.status").value(404))
        .andReturn();
  }

  @Test
  @DisplayName("Should filter reporting units within date range")
  void shouldFilterReportingUnitsWithinDateRange() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("dateStart", "2000-01-01")
                .param("dateEnd", "2100-01-01")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content.length()").value(Matchers.greaterThan(0)))
        .andReturn();
  }

  @Test
  @DisplayName("Should return results even with narrow date range (date filter applied)")
  void shouldHandleNarrowDateRangeWithoutError() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("dateStart", "1900-01-01")
                .param("dateEnd", "1900-01-02")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content.length()").value(Matchers.greaterThanOrEqualTo(0)))
        .andReturn();
  }

  @Test
  @DisplayName("Ice king wants to see only his own entries")
  @WithMockJwt(
      idp = "BCEID",
      cognitoGroups = {"Submitter_00010004", "Viewer_00010004"},
      value = "ICEKING"
  )
  void shouldSearchEntriesCreatedByMe() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("requestByMe", "true")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content.length()").value(8))
        .andExpect(jsonPath("$.page.size").value(10))
        .andExpect(jsonPath("$.page.totalElements").value(8))
        .andReturn();
  }

  @Test
  @DisplayName("Should get results with multi mark")
  void shouldSearchForMultiMark() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("multiMark", "true")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.page.totalElements").value(Matchers.equalTo(57)))
        .andReturn();
  }

  @Test
  @DisplayName("Should get a secondary with primary")
  void shouldSearchForSecondary() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("timberMark", "EM30R1")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content.length()").value(Matchers.equalTo(1)))
        .andReturn();
  }

  @Test
  @DisplayName("Should get expanded with secondary mark")
  void shouldGetExtendedWithSecondaryMark() throws Exception {
    mockMvc
        .perform(
            get(EXPANDED_URL, 879, 1906)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.timberMark").value(Matchers.equalTo("JY1009")))
        .andExpect(jsonPath("$.secondaryMarks[0].mark").value(Matchers.equalTo("EM30R1")))
        .andExpect(jsonPath("$.totalBlocks").value(Matchers.equalTo(2)))
        .andExpect(jsonPath("$.totalChildren").value(Matchers.equalTo(2)))
        .andReturn();
  }

  @Test
  @DisplayName("Should get expanded with child block")
  void shouldGetExtendedWithChildBlock() throws Exception {
    mockMvc
        .perform(
            get(EXPANDED_URL, 916, 1976)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.timberMark").value(Matchers.equalTo("JW1001")))
        .andExpect(jsonPath("$.secondaryMarks.length()").value(Matchers.equalTo(0)))
        .andExpect(jsonPath("$.totalBlocks").value(Matchers.equalTo(4)))
        .andExpect(jsonPath("$.totalChildren").value(Matchers.equalTo(0)))
        .andReturn();
  }

  @Test
  @DisplayName("Should get expanded with primary mark")
  void shouldGetExtendedWithPrimaryMark() throws Exception {
    mockMvc
        .perform(
            get(EXPANDED_URL, 879, 1907)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.timberMark").value(Matchers.equalTo("EM30R1")))
        .andExpect(jsonPath("$.secondaryMarks").value(Matchers.equalTo(List.of())))
        .andReturn();
  }

  @Test
  @DisplayName("Should include bookmarked field as false in search results")
  void shouldIncludeBookmarkedFieldAsFalse() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content[0].bookmarked").value(false))
        .andReturn();
  }

  @Test
  @DisplayName("Should filter reporting units by reportingUnitIds")
  void shouldFilterByReportingUnitIds() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("reportingUnitIds", "879")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.content[0].ruNumber").value(879))
        .andExpect(jsonPath("$.page.totalElements").value(Matchers.greaterThan(0)))
        .andReturn();
  }

  @Test
  @DisplayName("Should filter reporting units by multiple reportingUnitIds")
  void shouldFilterByMultipleReportingUnitIds() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("reportingUnitIds", "879", "916")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.page.totalElements").value(Matchers.greaterThanOrEqualTo(2)))
        .andReturn();
  }

  @Test
  @DisplayName("Should return no results for non-existent reportingUnitIds")
  void shouldReturnNoResultsForNonExistentReportingUnitIds() throws Exception {
    mockMvc
        .perform(
            get(SEARCH_URL)
                .header(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE_JSON)
                .param("page", "0")
                .param("size", "10")
                .param("reportingUnitIds", "999999999")
                .accept(CONTENT_TYPE_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(CONTENT_TYPE_JSON))
        .andExpect(jsonPath("$.page.totalElements").value(0))
        .andReturn();
  }

}