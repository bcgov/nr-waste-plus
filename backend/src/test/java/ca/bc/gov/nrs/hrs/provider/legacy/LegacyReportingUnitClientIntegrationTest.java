package ca.bc.gov.nrs.hrs.provider.legacy;

import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.unauthorized;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import ca.bc.gov.nrs.hrs.TestConstants;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Integrated Test | Legacy Reporting Unit Client")
class LegacyReportingUnitClientIntegrationTest extends AbstractTestContainerIntegrationTest {

  @RegisterExtension
  static WireMockExtension clientApiStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .port(10001)
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;
  @Autowired
  private RetryRegistry retryRegistry;
  @Autowired
  private JsonMapper mapper;
  @Autowired
  private LegacyReportingUnitClient legacyReportingUnitClient;

  @BeforeEach
  public void setUp() {
    clientApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @ParameterizedTest
  @CsvSource({
      "jake, jake|jakelyn|jakesh",
      "finn, ''",
      "lemongrab, lemongrabber|lemon"
  })
  @DisplayName("Search reporting unit users")
  void shouldSearchForRuUsers(String userId, String roles) {
    List<String> expected = Arrays.asList(roles.split("\\|"));
    String json = mapper.writeValueAsString(expected);

    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units-users"))
            .willReturn(okJson(json))
    );

    assertEquals(expected, legacyReportingUnitClient.searchReportingUnitUsers(userId));
  }

  @ParameterizedTest
  @MethodSource("searchReportingUnit")
  @DisplayName("Search reporting units with various filters and responses")
  void shouldSearchAndGet(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      ResponseDefinitionBuilder stubResponse,
      long size
  ) {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(stubResponse));

    Page<ReportingUnitSearchResultDto> result = legacyReportingUnitClient.searchReportingUnit(
        filters,
        pageable
    );
    assertNotNull(result);
    assertEquals(size, result.getTotalElements());
    assertEquals(size == 0, result.getContent().isEmpty());
  }

  @ParameterizedTest
  @MethodSource("expandedDetailsArguments")
  @DisplayName("Get expanded details for reporting unit")
  void shouldGetExpandedDetails(
      Long ruId,
      Long wasteAssessmentAreaId,
      ResponseDefinitionBuilder stubResponse,
      ReportingUnitSearchExpandedDto expectedDto
  ) {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units/ex/" + ruId + "/" + wasteAssessmentAreaId))
            .willReturn(stubResponse));

    var value = legacyReportingUnitClient.getSearchExpanded(ruId, wasteAssessmentAreaId);
    assertNotNull(value);
    assertEquals(expectedDto.id(), value.id());
    assertEquals(expectedDto.licenseNo(), value.licenseNo());
    assertEquals(expectedDto.cuttingPermit(), value.cuttingPermit());
    assertEquals(expectedDto.timberMark(), value.timberMark());
    assertEquals(expectedDto.exempted(), value.exempted());
    assertEquals(expectedDto.multiMark(), value.multiMark());
    assertEquals(expectedDto.netArea(), value.netArea());
    assertEquals(expectedDto.submitter(), value.submitter());
    assertEquals(expectedDto.attachment(), value.attachment());
    assertEquals(expectedDto.comments(), value.comments());
    assertEquals(expectedDto.totalBlocks(), value.totalBlocks());
  }

  private static Stream<Arguments> expandedDetailsArguments() {
    ReportingUnitSearchExpandedDto fullDto = new ReportingUnitSearchExpandedDto(
        201L, "LIC123", "CP01", "TMK456", true, false,
        new CodeDescriptionDto("APP", "Approved"), List.of(), 12.5, 12.0, "submitter1", null,
        "Some comments", 3L, 0L);
    ReportingUnitSearchExpandedDto emptyDto = new ReportingUnitSearchExpandedDto(
        202L, null, null, null, false, false,
        new CodeDescriptionDto("APP", "Approved"), List.of(), 0.0, 0.0, null, null, null, 0L, 0L);
    ReportingUnitSearchExpandedDto fallbackDto = new ReportingUnitSearchExpandedDto(
        203L, null, null, null, false, false,
        new CodeDescriptionDto("APP", "Approved"), List.of(), 0.0, 0.0, null, null, null, 0L, 0L);
    ReportingUnitSearchExpandedDto nullDto = new ReportingUnitSearchExpandedDto(
        null, null, null, null, false, false, new CodeDescriptionDto("APP", "Approved"), List.of(),
        0.0, 0.0, null, null, null, 0L, 0L);
    ReportingUnitSearchExpandedDto negativeDto = new ReportingUnitSearchExpandedDto(
        -2L, null, null, null, false, false, new CodeDescriptionDto("APP", "Approved"), List.of(),
        0.0, 0.0, null, null, null, 0L, 0L);

    return Stream.of(
        Arguments.argumentSet("101: Full details", 101L, 201L, okJson(TestConstants.EXPANDED_101),
            fullDto),
        Arguments.argumentSet("102: Empty details", 102L, 202L, okJson(TestConstants.EXPANDED_102),
            emptyDto),
        Arguments.argumentSet("103: Service unavailable", 103L, 203L, serviceUnavailable(),
            fallbackDto),
        Arguments.argumentSet("null: get me null, even if it should not", null, null,
            okJson(TestConstants.EXPANDED_NULL), nullDto),
        Arguments.argumentSet("-1: negative is a thing these days", -1L, -2L,
            okJson(TestConstants.EXPANDED_NEGATIVE), negativeDto)
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
        ),
        Arguments.argumentSet(
            "Search with no results object",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.EMPTY_JSON),
            0L
        ),
        Arguments.argumentSet(
            "Search with no results page",
            ReportingUnitSearchParametersDto.builder().build(),
            PageRequest.of(0, 10),
            okJson(ForestClientApiProviderTestConstants.EMPTY_PAGED_NOPAGE),
            0L
        )
    );
  }
}

