package ca.bc.gov.nrs.hrs.controller;

import static ca.bc.gov.nrs.hrs.TestConstants.LEGACY_RU_DETAILS;
import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.mockito.Mockito.doReturn;
import static org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint.SYSTEM_OUT;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@AutoConfigureMockMvc(print = SYSTEM_OUT)
@DisplayName("Integrated Test | Reporting Unit Controller")
class ReportingUnitControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

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

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private CircuitBreakerRegistry circuitBreakerRegistry;

  @Autowired
  private RetryRegistry retryRegistry;

  @MockitoSpyBean
  private FeatureFlagsConfiguration featureFlagsConfiguration;

  @BeforeEach
  void resetStubsAndBreakers() {
    clientApiStub.resetAll();
    legacyApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @Test
  @WithMockJwt
  @DisplayName("shouldReturnReportingUnitDetails_whenBothApisSucceed")
  void shouldReturnReportingUnitDetails_whenBothApisSucceed() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345"))
            .willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(CLIENTNUMBER_RESPONSE)));

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/reporting-units/{id}", 12345L)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/json;charset=UTF-8"))
        .andExpect(jsonPath("$.id").value(12345))
        .andExpect(jsonPath("$.client.code").value("00012797"))
        .andExpect(jsonPath("$.client.description").value("MINISTRY OF FORESTS"))
        .andExpect(jsonPath("$.clientStatus.code").value("ACT"))
        .andExpect(jsonPath("$.sampling.code").value("S01"))
        .andExpect(jsonPath("$.district.code").value("DND"));
  }

  @Test
  @WithMockJwt
  @DisplayName("shouldReturn404_whenForestClientNotFound")
  void shouldReturn404_whenForestClientNotFound() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345"))
            .willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(notFound()));

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/reporting-units/{id}", 12345L)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockJwt
  @DisplayName("shouldReturn404_whenReportingUnitDetailsFeatureFlagIsDisabled")
  void shouldReturn404_whenReportingUnitDetailsFeatureFlagIsDisabled() throws Exception {
    doReturn(false)
        .when(featureFlagsConfiguration)
        .isEnabled(FeatureFlag.REPORTING_UNIT_DETAILS_ENABLED);

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/reporting-units/{id}", 12345L)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isNotFound());
  }
}
