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
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
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

  @BeforeEach
  public void setUp() {
    clientApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
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
        [{"code":"C","description":"Complete"},
         {"code":"I","description":"Incomplete"},
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
        .andExpect(jsonPath("$[0].code").value("C"))
        .andExpect(jsonPath("$[1].code").value("I"))
        .andExpect(jsonPath("$[2].code").value("NA"));
  }

  @Test
  @DisplayName("Get harvest status codes with unknown context should return unfiltered list")
  void getHarvestStatusCodes_withUnknownContext_shouldReturnUnfiltered() throws Exception {
    String harvestStatusResponse =
        """
        [{"code":"C","description":"Complete"},
         {"code":"I","description":"Incomplete"}]
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
        .andExpect(jsonPath("$[0].code").value("C"))
        .andExpect(jsonPath("$[1].code").value("I"));
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
}
