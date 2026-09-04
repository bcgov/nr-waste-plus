package ca.bc.gov.nrs.hrs.controller;

import static ca.bc.gov.nrs.hrs.TestConstants.LEGACY_RU_DETAILS;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
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
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants;
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
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
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

  @DisplayName("Should Return 201 when Create Succeeds")
  @Test
  @WithMockJwt(
      cognitoGroups = {"WASTE_PLUS_ADMIN"}
  )
  void shouldReturn201_whenCreateSucceeds() throws Exception {
    // Legacy search: no existing reporting units
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(
                    ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));

    // Forest client exists
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

    // Legacy create returns new id as numeric JSON
    legacyApiStub.stubFor(
        post(urlPathEqualTo("/api/reporting-units"))
            .willReturn(okJson("333")));

    var requestJson = """
        {"clientNumber":"00012797","districtCode":"DND","samplingCode":"AVG","gradeCode":null}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson)
        )
        .andExpect(status().isCreated());
  }

  @DisplayName("Should Return 400 when Grade Missing For DKM")
  @Test
  @WithMockJwt(
      cognitoGroups = {"WASTE_PLUS_ADMIN"}
  )
  void shouldReturn400_whenGradeMissingForDKM() throws Exception {
    // Legacy search: no existing reporting units
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(
                    ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE)));

    var requestJson = """
        {"clientNumber":"00012797","districtCode":"DKM","samplingCode":"AVG"}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson)
        )
        .andExpect(status().isBadRequest());
  }

  @DisplayName("Should Return 409 when Reporting Unit Duplicate")
  @Test
  @WithMockJwt(
      cognitoGroups = {"WASTE_PLUS_ADMIN"}
  )
  void shouldReturn409_whenReportingUnitDuplicate() throws Exception {
    // Legacy search: returns an existing RU (totalElements > 0)
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/reporting-units"))
            .willReturn(
                okJson(ForestClientApiProviderTestConstants.REPORTING_UNITS_SEARCH_RESPONSE)));

    var requestJson = """
        {"clientNumber":"00012797","districtCode":"DND","samplingCode":"AVG","gradeCode":null}
        """;

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .post("/api/reporting-units")
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson)
        )
        .andExpect(status().isConflict());
  }

  @Test
  @WithMockJwt
  @DisplayName("Should Return Reporting Unit Details when Both APIs Succeed")
  void shouldReturnReportingUnitDetails_whenBothApisSucceed() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345"))
            .willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

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
  @DisplayName("Should Return 404 when Forest Client Not Found")
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
  @DisplayName("Should Return 404 when Reporting Unit Details Feature Flag Is Disabled")
  void shouldReturn404_whenReportingUnitDetailsFeatureFlagIsDisabled()
      throws Exception {
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

  @Test
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_VIEWER_00012797"}
  )
  @DisplayName("Should Return 200 when Bceid User Has Matching Client Role")
  void shouldReturn200_whenBceidUserHasMatchingClientRole() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345"))
            .willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

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
        .andExpect(jsonPath("$.client.code").value("00012797"));
  }

  @Test
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"WASTE_PLUS_SUBMITTER_99999999"}
  )
  @DisplayName("Should Return 403 when Bceid User Has No Matching Client Role")
  void shouldReturn403_whenBceidUserHasNoMatchingClientRole() throws Exception {
    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/reporting-units/12345"))
            .willReturn(okJson(LEGACY_RU_DETAILS)));

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/00012797"))
            .willReturn(okJson(ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE)));

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/reporting-units/{id}", 12345L)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(status().isForbidden());
  }
}
