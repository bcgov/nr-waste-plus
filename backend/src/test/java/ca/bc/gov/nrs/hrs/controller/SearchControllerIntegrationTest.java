package ca.bc.gov.nrs.hrs.controller;

import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.unauthorized;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants;
import ca.bc.gov.nrs.hrs.repository.UserBookmarkRepository;
import com.github.tomakehurst.wiremock.client.CountMatchingStrategy;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@WithMockJwt
@DisplayName("Integrated Test | Search Controller")
class SearchControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @RegisterExtension
  static WireMockExtension legacyApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10001)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @RegisterExtension
  static WireMockExtension clientApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10000)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @Autowired
  private MockMvc mockMvc;
  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;
  @Autowired
  private RetryRegistry retryRegistry;
  @Autowired
  private UserBookmarkRepository bookmarkRepository;

  @BeforeEach
  public void setUp() {
    legacyApiStub.resetAll();
    clientApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);

    bookmarkRepository.deleteAll();
  }

  @ParameterizedTest
  @MethodSource("searchReportingUnit")
  @DisplayName("Search Reporting Unit")
  void getOpeningCategories_happyPath_shouldSucceed(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      ResponseDefinitionBuilder stubResponse,
      long size)
      throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units")).willReturn(stubResponse));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParams(filters.toMultiMap(pageable))
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(size))
        .andReturn();
  }

  @ParameterizedTest
  @MethodSource("searchReportingUnitExpanded")
  @DisplayName("Get Expanded Details for Reporting Unit")
  void shouldGetExpandedDetails(
      Long ruId,
      Long wasteAssessmentAreaId,
      String clientNumber,
      ResponseDefinitionBuilder stubResponse,
      String expectedJsonPath,
      Object expectedValue)
      throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/reporting-units/" + ruId))
            .willReturn(
                okJson(
                    """
                    {"clientNumber": "%s", "clientLocnCode": "00"}
                    """
                        .formatted(clientNumber))));
    legacyApiStub.stubFor(
        WireMock.get(
                urlPathEqualTo(
                    "/api/search/reporting-units/ex/" + ruId + "/" + wasteAssessmentAreaId))
            .willReturn(stubResponse));

    mockMvc
        .perform(
            get("/api/search/reporting-units/ex/" + ruId + "/" + wasteAssessmentAreaId)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath(expectedJsonPath).value(expectedValue))
        .andReturn();
  }

  @ParameterizedTest
  @MethodSource("searchReportingUnitExpandedBceid")
  @DisplayName("Get Expanded Details for Reporting Unit with BCeID user")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Viewer_00010002"})
  void shouldGetExpandedDetails_bceid(
      Long ruId,
      Long wasteAssessmentAreaId,
      String ruClientNumber,
      ResponseDefinitionBuilder stubResponse,
      int expectedStatus)
      throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/reporting-units/" + ruId))
            .willReturn(
                okJson(
                    """
                    {"clientNumber": "%s", "clientLocnCode": "00"}
                    """
                        .formatted(ruClientNumber))));
    legacyApiStub.stubFor(
        WireMock.get(
                urlPathEqualTo(
                    "/api/search/reporting-units/ex/" + ruId + "/" + wasteAssessmentAreaId))
            .willReturn(stubResponse));

    mockMvc
        .perform(
            get("/api/search/reporting-units/ex/" + ruId + "/" + wasteAssessmentAreaId)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().is(expectedStatus));
  }

  @ParameterizedTest
  @MethodSource("searchReportingUnitBceid")
  @DisplayName("Search Reporting Unit with BCeID user")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Viewer_00010002"})
  void searchReportingUnit_bceid_shouldValidateClientNumbers(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      ResponseDefinitionBuilder stubResponse,
      int expectedStatus,
      long size)
      throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units")).willReturn(stubResponse));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    var result =
        mockMvc
            .perform(
                get("/api/search/reporting-units")
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .queryParams(filters.toMultiMap(pageable))
                    .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().is(expectedStatus));

    if (expectedStatus == 200) {
      result
          .andExpect(content().contentType("application/json;charset=UTF-8"))
          .andExpect(jsonPath("$.content.length()").value(size));
    }
  }

  @Test
  @DisplayName("Search Reporting Unit Users")
  void searchReportingUnitUsers_shouldSucceed() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units-users"))
            .willReturn(okJson("[\"TESTUSER\"]")));

    mockMvc
        .perform(
            get("/api/search/reporting-units-users")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("userId", "TEST")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0]").value("TESTUSER"))
        .andReturn();
  }

  private static Stream<Arguments> searchReportingUnitBceid() {
    return Stream.of(
        Arguments.argumentSet(
            "BCeID with valid client number in roles",
            ReportingUnitSearchParametersDto.builder()
                .mainSearchTerm("36834")
                .clientNumbers(List.of("00010002"))
                .build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE),
            200,
            1L),
        Arguments.argumentSet(
            "BCeID with invalid client number not in roles",
            ReportingUnitSearchParametersDto.builder()
                .mainSearchTerm("36834")
                .clientNumbers(List.of("99999999"))
                .build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE),
            403,
            0L),
        Arguments.argumentSet(
            "BCeID with no client numbers filter",
            ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE),
            200,
            1L),
        Arguments.argumentSet(
            "BCeID with partially valid client numbers",
            ReportingUnitSearchParametersDto.builder()
                .mainSearchTerm("36834")
                .clientNumbers(List.of("00010002", "99999999"))
                .build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE),
            403,
            0L));
  }

  private static Stream<Arguments> searchReportingUnitExpanded() {
    return Stream.of(
        Arguments.argumentSet(
            "Get expanded with full details",
            101L,
            201L,
            "00010002",
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_FULL),
            "$.id",
            101),
        Arguments.argumentSet(
            "Get expanded with minimal details",
            102L,
            202L,
            "00010002",
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_MINIMAL),
            "$.id",
            102),
        Arguments.argumentSet(
            "Get expanded with empty response (fallback)",
            103L,
            203L,
            "00010002",
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_EMPTY),
            "$.id",
            203),
        Arguments.argumentSet(
            "Service unavailable triggers fallback",
            104L,
            204L,
            "00010002",
            serviceUnavailable(),
            "$.id",
            204),
        Arguments.argumentSet(
            "Not found triggers fallback", 105L, 205L, "00010002", notFound(), "$.id", 205),
        Arguments.argumentSet(
            "Unauthorized triggers fallback", 106L, 206L, "00010002", unauthorized(), "$.id", 206));
  }

  private static Stream<Arguments> searchReportingUnitExpandedBceid() {
    return Stream.of(
        Arguments.argumentSet(
            "BCeID with matching client number",
            201L,
            301L,
            "00010002",
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_FULL),
            200),
        Arguments.argumentSet(
            "BCeID with non-matching client number",
            202L,
            302L,
            "99999999",
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_MINIMAL),
            403));
  }

  private static Stream<Arguments> searchReportingUnit() {
    return Stream.of(
        Arguments.argumentSet(
            "Search with results and no filter",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE),
            0L),
        Arguments.argumentSet(
            "Search with results and 36834 as filter ",
            ReportingUnitSearchParametersDto.builder().mainSearchTerm("36834").build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE),
            1L),
        Arguments.argumentSet(
            "Search with no results",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE),
            0L),
        Arguments.argumentSet(
            "Circuit breaker for unavailable",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(1, 10),
            serviceUnavailable(),
            0L),
        Arguments.argumentSet(
            "Circuit breaker for not found",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(1, 10),
            notFound(),
            0L),
        Arguments.argumentSet(
            "Circuit breaker for unauthorized",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(1, 10),
            unauthorized(),
            0L));
  }

  @Test
  @DisplayName("Search bookmarked reporting units with bookmarks should return bookmarked results")
  void searchBookmarkedReportingUnits_withBookmarks_shouldReturnResults() throws Exception {
    // First, add a bookmark for reporting unit 36834 (the one in the stub response)
    mockMvc
        .perform(
            put("/api/users/bookmarks/{reportingUnitId}", 36834L)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isAccepted());

    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("bookmarked", "true")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].ruNumber").value(36834))
        .andExpect(jsonPath("$.content[0].bookmarked").value(true))
        .andReturn();
  }

  @Test
  @DisplayName("Search bookmarked reporting units with no bookmarks should return empty")
  void searchBookmarkedReportingUnits_withNoBookmarks_shouldReturnEmpty() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(
                    ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("bookmarked", "true")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andReturn();
  }

  @Test
  @DisplayName("Search results should show bookmarked=false when no bookmarks exist")
  void searchReportingUnits_withoutBookmarks_shouldShowBookmarkedFalse() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].bookmarked").value(false))
        .andReturn();
  }

  @Test
  @DisplayName("Search results should show bookmarked=true when result is bookmarked")
  void searchReportingUnits_withBookmark_shouldShowBookmarkedTrue() throws Exception {
    // Add a bookmark for reporting unit 36834
    mockMvc
        .perform(
            put("/api/users/bookmarks/{reportingUnitId}", 36834L)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isAccepted());

    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andExpect(jsonPath("$.content[0].bookmarked").value(true))
        .andReturn();
  }

  @Test
  @DisplayName("Search Reporting Unit | legacy param absent routes to legacy (called exactly once)")
  void searchReportingUnit_legacyAbsent_shouldCallLegacyOnce() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andReturn();

    legacyApiStub.verify(
        1, getRequestedFor(urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName("Search Reporting Unit | legacy=true routes to legacy (lenient, called once)")
  void searchReportingUnit_legacyTrue_shouldCallLegacyOnce() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("legacy", "true")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andReturn();

    legacyApiStub.verify(
        1, getRequestedFor(urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName("Search Reporting Unit | legacy=garbage is lenient and routes to legacy (no 400)")
  void searchReportingUnit_legacyGarbage_shouldBeLenientAndCallLegacyOnce() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    // Garbage value must not produce a 400: the parameter is bound leniently as a String (DEC-011).
    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("legacy", "yes")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andReturn();

    legacyApiStub.verify(
        1, getRequestedFor(urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName(
      "Search Reporting Unit | legacy=false routes to PostgreSQL (real query, legacy not called)")
  void searchReportingUnit_legacyFalse_shouldQueryPostgres_withoutLegacyCall() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("legacy", "false")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        // D3b: the PostgreSQL source executes the real list query. No seeded RU matches the
        // digits-only term, so the honest result is an empty page — not an error and not a
        // cross-source fallback.
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andExpect(jsonPath("$.page.totalElements").value(0))
        .andReturn();

    legacyApiStub.verify(
        0, getRequestedFor(urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName(
      "Search Reporting Unit | legacy failure stays on legacy source (no cross-source fallback)")
  void searchReportingUnit_legacyFailure_shouldNotFallbackToPostgres() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(serviceUnavailable()));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        // Existing legacy error convention: circuit-breaker fallback yields 200 with an empty
        // page. A cross-source fallback would surface as 501 instead.
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andReturn();

    // Legacy was actually hit; the count is not pinned because the HTTP stack may retry the same
    // source on 503 (pre-existing behavior documented at
    // LegacyReportingUnitClientIntegrationTest.shouldReturnEmptyBlockList_whenLegacyBlockListReturnsServerError).
    // Cross-source fallback is excluded by the 200 response above.
    // Legacy was actually hit; the count is not pinned because the HTTP stack may retry the same
    // source on 503 (pre-existing behavior documented at
    // LegacyReportingUnitClientIntegrationTest.shouldReturnEmptyBlockList_whenLegacyBlockListReturnsServerError).
    // Cross-source fallback is excluded by the 200 response above.
    legacyApiStub.verify(
        new CountMatchingStrategy(CountMatchingStrategy.GREATER_THAN_OR_EQUAL, 1),
        getRequestedFor(urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName("Search Reporting Unit | legacy flag alone keeps the empty-filters gate (no dispatch)")
  void searchReportingUnit_legacyFlagAlone_shouldReturnEmptyPage_withoutProviderCall()
      throws Exception {
    // The gate is exercised with legacy=false: if `legacy` were ever counted by
    // ReportingUnitSearchParametersDto.isEmpty(), this request would dispatch to the PostgreSQL
    // stub and fail with 501 instead of returning an empty page (#1238).
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("legacy", "false")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(0))
        .andReturn();

    legacyApiStub.verify(
        0, getRequestedFor(urlPathEqualTo("/api/search/reporting-units")));
  }

  @Test
  @DisplayName(
      "Search Reporting Unit | forwarded legacy request does not carry the legacy flag (#1238)")
  void searchReportingUnit_legacySource_shouldNotForwardLegacyParamToLegacy() throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002)));

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParam("mainSearchTerm", "36834")
                .queryParam("legacy", "true")
                .queryParam("page", "0")
                .queryParam("size", "10")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.content.length()").value(1))
        .andReturn();

    var forwardedRequests =
        legacyApiStub.findAll(getRequestedFor(urlPathEqualTo("/api/search/reporting-units")));
    assertThat(forwardedRequests).hasSize(1);
    assertThat(forwardedRequests.getFirst().getQueryParams()).doesNotContainKey("legacy");
  }
}
