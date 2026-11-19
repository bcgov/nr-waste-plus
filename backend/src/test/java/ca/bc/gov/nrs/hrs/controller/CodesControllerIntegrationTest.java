package ca.bc.gov.nrs.hrs.controller;

import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@WithMockJwt
@DisplayName("Integrated Test | Codes Controller")
class CodesControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

  /** Legacy-shaped harvest status payload matching the shipped variant allowlists. */
  private static final String HARVEST_STATUS_RESPONSE =
      """
      [{"code":"COM","description":"Complete"},
       {"code":"INC","description":"Incomplete"},
       {"code":"NA","description":"N/A - Not applicable"}]
      """;

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
  private MockMvc mockMvc;
  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;
  @Autowired
  private RetryRegistry retryRegistry;
  @Autowired
  private ReportingUnitRepository reportingUnitRepository;

  @BeforeEach
  public void setUp() {
    clientApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    circuitBreakerRegistry.circuitBreaker("harvestStatusCodes").reset();
    circuitBreakerRegistry.circuitBreaker("maturityTypeCodes").reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @Test
  @DisplayName("Get districts happy Path should Succeed")
  void getDistricts_happyPath_shouldSucceed() throws Exception {
    CodeDescriptionDto category = new CodeDescriptionDto("DCC", "Cariboo-Chilcotin");

    mockMvc
        .perform(
            get("/api/codes/districts")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$[0].code").value(category.code()))
        .andExpect(jsonPath("$[0].description").value(category.description()))
        .andReturn();
  }

  @Test
  @DisplayName("Get sampling happy Path should Succeed")
  void getSamplingOptions_happyPath_shouldSucceed() throws Exception {
    CodeDescriptionDto category = new CodeDescriptionDto("AGR", "Aggregate");
    String samplingResponse =
        """
        [{"code":"AGR","description":"Aggregate"},
         {"code":"BLK","description":"Cutblock"},
         {"code":"OCU","description":"Ocular"}]
        """;

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/samplings")).willReturn(okJson(samplingResponse)));

    mockMvc
        .perform(
            get("/api/codes/samplings")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$[0].code").value(category.code()))
        .andExpect(jsonPath("$[0].description").value(category.description()))
        .andReturn();
  }

  @Test
  @DisplayName("Get assess area status happy Path should Succeed")
  void getAssessAreaStatus_happyPath_shouldSucceed() throws Exception {
    CodeDescriptionDto category = new CodeDescriptionDto("APP", "Approved");

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/assess-area-statuses"))
            .willReturn(okJson("[{\"code\":\"APP\",\"description\":\"Approved\"}]")));

    mockMvc
        .perform(
            get("/api/codes/assess-area-statuses")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$[0].code").value(category.code()))
        .andExpect(jsonPath("$[0].description").value(category.description()))
        .andReturn();
  }

  @Test
  @DisplayName("Get harvest status codes without context should return unfiltered list")
  void getHarvestStatusCodes_withoutContext_shouldSucceed() throws Exception {
    String harvestStatusResponse =
        """
        [{"code":"COM","description":"Complete"},
         {"code":"INC","description":"Incomplete"},
         {"code":"NA","description":"N/A - Not applicable"}]
        """;

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/harvest-statuses"))
            .willReturn(okJson(harvestStatusResponse)));

    mockMvc
        .perform(
            get("/api/codes/harvest-statuses")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].code").value("COM"))
        .andExpect(jsonPath("$[1].code").value("INC"))
        .andExpect(jsonPath("$[2].code").value("NA"));
  }

  @Test
  @DisplayName("Get harvest status codes with unknown context should return unfiltered list")
  void getHarvestStatusCodes_withUnknownContext_shouldReturnUnfiltered() throws Exception {
    String harvestStatusResponse =
        """
        [{"code":"COM","description":"Complete"},
         {"code":"INC","description":"Incomplete"}]
        """;

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/harvest-statuses"))
            .willReturn(okJson(harvestStatusResponse)));

    mockMvc
        .perform(
            get("/api/codes/harvest-statuses")
                .param("reportingUnitId", "999999999")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].code").value("COM"))
        .andExpect(jsonPath("$[1].code").value("INC"));
  }

  @Test
  @DisplayName("Get harvest status codes for Interior reporting unit should drop N/A")
  void getHarvestStatusCodes_withInteriorReportingUnit_shouldFilterUsingShippedAllowlist()
      throws Exception {
    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/harvest-statuses"))
            .willReturn(okJson(HARVEST_STATUS_RESPONSE)));

    Long interiorReportingUnitId = persistReportingUnit("INTERIOR");

    mockMvc
        .perform(
            get("/api/codes/harvest-statuses")
                .param("reportingUnitId", String.valueOf(interiorReportingUnitId))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].code").value("COM"))
        .andExpect(jsonPath("$[1].code").value("INC"));
  }

  @Test
  @DisplayName("Get harvest status codes for Coastal reporting unit should keep N/A")
  void getHarvestStatusCodes_withCoastalReportingUnit_shouldReturnCoastalAllowlist()
      throws Exception {
    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/harvest-statuses"))
            .willReturn(okJson(HARVEST_STATUS_RESPONSE)));

    Long coastalReportingUnitId = persistReportingUnit("COASTAL");

    mockMvc
        .perform(
            get("/api/codes/harvest-statuses")
                .param("reportingUnitId", String.valueOf(coastalReportingUnitId))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].code").value("COM"))
        .andExpect(jsonPath("$[1].code").value("INC"))
        .andExpect(jsonPath("$[2].code").value("NA"));
  }

  @Test
  @DisplayName("Get maturity type codes should succeed")
  void getMaturityTypeCodes_happyPath_shouldSucceed() throws Exception {
    String maturityResponse =
        """
        [{"code":"MAT","description":"Mature"},
         {"code":"IMM","description":"Immature"}]
        """;

    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/maturity-types"))
            .willReturn(okJson(maturityResponse)));

    mockMvc
        .perform(
            get("/api/codes/maturity-types")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].code").value("MAT"))
        .andExpect(jsonPath("$[0].description").value("Mature"))
        .andExpect(jsonPath("$[1].code").value("IMM"));
  }

  @Test
  @DisplayName("Get maturity type codes returns empty list when legacy is unavailable")
  void getMaturityTypeCodes_whenLegacyUnavailable_shouldReturnEmptyList() throws Exception {
    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/maturity-types"))
            .willReturn(WireMock.serviceUnavailable()));

    mockMvc
        .perform(
            get("/api/codes/maturity-types")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  @DisplayName("Get harvest status codes returns empty list when legacy is unavailable")
  void getHarvestStatusCodes_whenLegacyUnavailable_shouldReturnEmptyList() throws Exception {
    clientApiStub.stubFor(
        WireMock.get(urlPathEqualTo("/api/codes/harvest-statuses"))
            .willReturn(WireMock.serviceUnavailable()));

    mockMvc
        .perform(
            get("/api/codes/harvest-statuses")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  @DisplayName("Get district average criteria codes should return effective codes ordered by criterion")
  void getDistrictAverageCriteriaCodes_happyPath_shouldSucceed() throws Exception {
    mockMvc
        .perform(
            get("/api/codes/district-average-criteria")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.length()").value(11))
        .andExpect(jsonPath("$[0].code").value("1"))
        .andExpect(
            jsonPath("$[0].description")
                .value(
                    "Forestry Licence to Cut with a volume limit of 2,000 m3 or less, written in the licence agreement."))
        .andExpect(jsonPath("$[0].areas.length()").value(0))
        .andExpect(jsonPath("$[1].code").value("2"))
        .andExpect(jsonPath("$[9].code").value("10"))
        .andExpect(jsonPath("$[10].code").value("11"))
        .andExpect(
            jsonPath("$[10].description")
                .value(
                    "A submission for a late waste assessment where a field survey is no longer feasible. This criterion can only be used under the direction of the District Manager and the Area Director."));
  }

  private Long persistReportingUnit(String gradeCode) {
    ReportingUnitEntity reportingUnit = new ReportingUnitEntity();
    reportingUnit.setClientNumber("00012797");
    reportingUnit.setClientLocnCode("TEST-" + UUID.randomUUID().toString().substring(0, 8));
    reportingUnit.setGeographicCode("DKM");
    reportingUnit.setGradeCode(gradeCode);
    reportingUnit.setCreatedBy("codes-test");
    reportingUnit.setUpdatedBy("codes-test");
    return reportingUnitRepository.saveAndFlush(reportingUnit).getId();
  }
}
