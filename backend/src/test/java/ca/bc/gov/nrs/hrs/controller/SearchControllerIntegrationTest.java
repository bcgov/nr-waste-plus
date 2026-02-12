package ca.bc.gov.nrs.hrs.controller;

import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.unauthorized;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.BackendConstants;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
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

  @BeforeEach
  public void setUp() {
    legacyApiStub.resetAll();
    clientApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @ParameterizedTest
  @MethodSource("searchReportingUnit")
  @DisplayName("Search Reporting Unit")
  void getOpeningCategories_happyPath_shouldSucceed(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      ResponseDefinitionBuilder stubResponse,
      long size
  ) throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(stubResponse)
    );

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/clients/findByClientNumber/00010002"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENT_00010002))
    );

    mockMvc
        .perform(
            get("/api/search/reporting-units")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .queryParams(filters.toMultiMap(pageable))
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
        .andExpect(jsonPath("$.content.length()").value(size))
        .andReturn();
  }

  @ParameterizedTest
  @MethodSource("searchReportingUnitExpanded")
  @DisplayName("Get Expanded Details for Reporting Unit")
  void shouldGetExpandedDetails(
      Long ruId,
      Long blockId,
      ResponseDefinitionBuilder stubResponse,
      String expectedJsonPath,
      Object expectedValue
  ) throws Exception {
    legacyApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/search/reporting-units/ex/" + ruId + "/" + blockId))
            .willReturn(stubResponse)
    );

    mockMvc
        .perform(
            get("/api/search/reporting-units/ex/" + ruId + "/" + blockId)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
        .andExpect(jsonPath(expectedJsonPath).value(expectedValue))
        .andReturn();
  }

  private static Stream<Arguments> searchReportingUnitExpanded() {
    return Stream.of(
        Arguments.argumentSet(
            "Get expanded with full details",
            101L,
            201L,
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_FULL),
            "$.id",
            101
        ),
        Arguments.argumentSet(
            "Get expanded with minimal details",
            102L,
            202L,
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_MINIMAL),
            "$.id",
            102
        ),
        Arguments.argumentSet(
            "Get expanded with empty response (fallback)",
            103L,
            203L,
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNIT_EXPANDED_EMPTY),
            "$.id",
            203
        ),
        Arguments.argumentSet(
            "Service unavailable triggers fallback",
            104L,
            204L,
            serviceUnavailable(),
            "$.id",
            204
        ),
        Arguments.argumentSet(
            "Not found triggers fallback",
            105L,
            205L,
            notFound(),
            "$.id",
            205
        ),
        Arguments.argumentSet(
            "Unauthorized triggers fallback",
            106L,
            206L,
            unauthorized(),
            "$.id",
            206
        )
    );
  }

  private static Stream<Arguments> searchReportingUnit() {
    return Stream.of(
        Arguments.argumentSet(
            "Search with results and no filter",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE),
            1L
        ),
        Arguments.argumentSet(
            "Search with no results",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE),
            0L
        ),
        Arguments.argumentSet(
            "Circuit breaker for unavailable",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(1, 10),
            serviceUnavailable(),
            0L
        ),
        Arguments.argumentSet(
            "Circuit breaker for not found",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(1, 10),
            notFound(),
            0L
        ),
        Arguments.argumentSet(
            "Circuit breaker for unauthorized",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(1, 10),
            unauthorized(),
            0L
        )
    );
  }

}