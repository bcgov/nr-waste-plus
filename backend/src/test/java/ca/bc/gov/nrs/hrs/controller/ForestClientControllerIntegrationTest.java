package ca.bc.gov.nrs.hrs.controller;

import static ca.bc.gov.nrs.hrs.BackendConstants.X_TOTAL_COUNT;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.EMPTY_JSON;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.EMPTY_PAGED_NOPAGE;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.MY_FOREST_CLIENTS_LEGACY;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.ONE_BY_VALUE_LIST;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.REPORTING_UNITS_EMPTY_SEARCH_RESPONSE;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.TWO_LOCATIONS_LIST;
import static com.github.tomakehurst.wiremock.client.WireMock.badRequest;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.status;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.stream.Stream;
import org.apache.commons.lang3.StringUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

@AutoConfigureMockMvc
@WithMockJwt
@DisplayName("Integrated Test | Forest Client Controller")
class ForestClientControllerIntegrationTest extends AbstractTestContainerIntegrationTest {

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

  @BeforeEach
  public void resetCircuitBreaker() {
    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @ParameterizedTest
  @MethodSource("fetchClientByNumber")
  @DisplayName("Fetch client by number happy path should succeed")
  void fetchClientByNumber_shouldSucceed(
      String clientNumber,
      ResponseDefinitionBuilder stubResponse,
      HttpStatusCode statusCode
  ) throws Exception {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/" + clientNumber))
            .willReturn(stubResponse));

    ResultActions response = mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/forest-clients/{clientNumber}", clientNumber)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
        );

    if (statusCode.is2xxSuccessful()) {
      response
          .andExpect(MockMvcResultMatchers.status().isOk())
          .andExpect(content().contentType("application/json"))
          .andExpect(jsonPath("$.clientNumber").value("00012797"))
          .andExpect(jsonPath("$.clientName").value("MINISTRY OF FORESTS"))
          .andExpect(jsonPath("$.legalFirstName").doesNotExist())
          .andExpect(jsonPath("$.legalMiddleName").doesNotExist())
          .andExpect(jsonPath("$.clientStatusCode.code").value("ACT"))
          .andExpect(jsonPath("$.clientTypeCode.code").value("F"))
          .andExpect(jsonPath("$.acronym").value("MOF"))
          .andReturn();
    } else {
      response.andExpect(MockMvcResultMatchers.status().is(statusCode.value()));
    }

  }

  @ParameterizedTest
  @MethodSource("searchClients")
  @DisplayName("Search clients by name, acronym, or number should succeed")
  void fetchClientByName_shouldSucceed(
      int page,
      int size,
      String value,
      ResponseDefinitionBuilder stub,
      long expectedSize
  ) throws Exception {

    clientApiStub.stubFor(get(urlPathEqualTo("/clients/search/by")).willReturn(stub));

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/forest-clients/byNameAcronymNumber")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .param("page", String.valueOf(page))
                .param("size", String.valueOf(size))
                .param("value", value)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(MockMvcResultMatchers.status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.length()").value(expectedSize))
        .andReturn();
  }

  @ParameterizedTest
  @MethodSource("fetchClientLocations")
  @DisplayName("Fetch client locations should succeed")
  void fetchClientLocations_shouldSucceed(
      String clientNumber,
      ResponseDefinitionBuilder stub,
      long size
  ) throws Exception {

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/" + clientNumber + "/locations"))
            .willReturn(stub)
    );

    mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/forest-clients/{clientNumber}/locations", clientNumber)
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(MockMvcResultMatchers.status().isOk())
        .andExpect(content().contentType("application/json"))
        .andExpect(jsonPath("$.length()").value(size))
        .andReturn();
  }

  @ParameterizedTest
  @MethodSource("fetchClientByNumberList")
  @DisplayName("Fetch client by number list happy path should succeed")
  void fetchByClientNumberList_shouldSucceed(
      String clientNumber,
      ResponseDefinitionBuilder stubResponse,
      HttpStatusCode statusCode
  ) throws Exception {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/search"))
            .willReturn(stubResponse));

    ResultActions response = mockMvc
        .perform(
            MockMvcRequestBuilders
                .get("/api/forest-clients/searchByNumbers")
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .param("values", clientNumber)
                .accept(MediaType.APPLICATION_JSON)
        )
        .andExpect(MockMvcResultMatchers.status().isOk());

    if (statusCode.is2xxSuccessful()) {
      response
          .andExpect(content().contentType("application/json"))
          .andExpect(jsonPath("$.[0].clientNumber").value("00012797"))
          .andExpect(jsonPath("$.[0].clientName").value("MINISTRY OF FORESTS"))
          .andExpect(jsonPath("$.[0].legalFirstName").doesNotExist())
          .andExpect(jsonPath("$.[0].legalMiddleName").doesNotExist())
          .andExpect(jsonPath("$.[0].clientStatusCode.code").value("ACT"))
          .andExpect(jsonPath("$.[0].clientTypeCode.code").value("F"))
          .andExpect(jsonPath("$.[0].acronym").value("MOF"))
          .andReturn();
    }

  }

  @ParameterizedTest
  @MethodSource("fetchMyClients")
  @DisplayName("Fetch my client")
  @WithMockJwt(
      idp = "bceidbusiness",
      cognitoGroups = {"Approver_00010004","Approver_00012797"}
  )
  void fetchMyClientsWithValue(
      String value,
      ResponseDefinitionBuilder apiStub,
      ResponseDefinitionBuilder legacyStub,
      boolean hasResults
  ) throws Exception {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/search"))
            .willReturn(apiStub));

    legacyApiStub.stubFor(
        get(urlPathEqualTo("/api/search/my-forest-clients"))
            .willReturn(legacyStub));

    var requestBuilder =  MockMvcRequestBuilders
        .get("/api/forest-clients/clients")
        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .accept(MediaType.APPLICATION_JSON);

    if (StringUtils.isNotBlank(value))
      requestBuilder = requestBuilder.queryParam("value",value);

    ResultActions response = mockMvc
        .perform(requestBuilder)
        .andExpect(MockMvcResultMatchers.status().isOk());

    if (hasResults) {
      response
          .andExpect(content().contentType("application/json"))
          .andExpect(jsonPath("$.content.[0].client.code").value("00012797"))
          .andExpect(jsonPath("$.content.[0].client.description").value("MINISTRY OF FORESTS"))
          .andReturn();
    } else {
      response.andExpect(jsonPath("$.content").isEmpty());
    }

  }

  private static Stream<Arguments> fetchMyClients(){
    return Stream.of(
        Arguments.argumentSet(
            "No arguments, with return",
            null,
            okJson(ONE_BY_VALUE_LIST),
            okJson(MY_FOREST_CLIENTS_LEGACY),
            true
        ),
        Arguments.argumentSet(
            "With arguments, with return",
            "forest",
            okJson(ONE_BY_VALUE_LIST),
            okJson(MY_FOREST_CLIENTS_LEGACY),
            true
        ),
        Arguments.argumentSet(
            "With arguments, no return",
            "kelp",
            okJson("[]"),
            okJson(REPORTING_UNITS_EMPTY_SEARCH_RESPONSE),
            false
        ),
        Arguments.argumentSet(
            "With return but no page",
            null,
            okJson("[]"),
            okJson(EMPTY_PAGED_NOPAGE),
            false
        ),
        Arguments.argumentSet(
            "With empty return",
            null,
            okJson("[]"),
            okJson(EMPTY_JSON),
            false
        )
    );
  }

  private static Stream<Arguments> fetchClientByNumber() {
    return Stream.of(
        Arguments.argumentSet(
            "Happy path",
            "00012797",
            okJson(CLIENTNUMBER_RESPONSE),
            HttpStatusCode.valueOf(200)
        ),
        Arguments.argumentSet(
            "Not found breaker",
            "00012898",
            notFound(),
            HttpStatusCode.valueOf(404)
        ),
        Arguments.argumentSet(
            "Unavailable breaker",
            "00012898",
            serviceUnavailable(),
            HttpStatusCode.valueOf(404)
        ),
        Arguments.argumentSet(
            "Rate limiter breaker",
            "00012898",
            status(429),
            HttpStatusCode.valueOf(404)
        ),
        Arguments.argumentSet(
            "Bad request breaker",
            "00012898",
            badRequest(),
            HttpStatusCode.valueOf(404)
        )
    );
  }

  private static Stream<Arguments> fetchClientByNumberList() {
    return Stream.of(
        Arguments.argumentSet(
            "Happy path",
            "00012797",
            okJson(ONE_BY_VALUE_LIST),
            HttpStatusCode.valueOf(200)
        ),
        Arguments.argumentSet(
            "Not found breaker",
            "00012898",
            notFound(),
            HttpStatusCode.valueOf(404)
        ),
        Arguments.argumentSet(
            "Unavailable breaker",
            "00012898",
            serviceUnavailable(),
            HttpStatusCode.valueOf(404)
        ),
        Arguments.argumentSet(
            "Rate limiter breaker",
            "00012898",
            status(429),
            HttpStatusCode.valueOf(404)
        ),
        Arguments.argumentSet(
            "Bad request breaker",
            "00012898",
            badRequest(),
            HttpStatusCode.valueOf(404)
        )
    );
  }

  private static Stream<Arguments> searchClients() {
    return Stream.of(
        Arguments.argumentSet(
            "Circuit Breaker",
            0,
            10,
            "COMPANY",
            serviceUnavailable(),
            0
        ),
        Arguments.argumentSet(
            "India",
            0,
            10,
            "INDIA",
            okJson(ONE_BY_VALUE_LIST).withHeader(X_TOTAL_COUNT, "1"),
            1
        ),
        Arguments.argumentSet(
            "Sample BC",
            0,
            10,
            "SAMPLIBC",
            okJson(ONE_BY_VALUE_LIST).withHeader(X_TOTAL_COUNT, "1"),
            1
        ),
        Arguments.argumentSet(
            "Client number",
            0,
            10,
            "00000001",
            okJson(ONE_BY_VALUE_LIST).withHeader(X_TOTAL_COUNT, "1"),
            1
        ),
        Arguments.argumentSet(
            "Client number simple",
            0,
            10,
            "1",
            okJson(ONE_BY_VALUE_LIST).withHeader(X_TOTAL_COUNT, "1"),
            1
        )
    );
  }

  private static Stream<Arguments> fetchClientLocations() {
    return
        Stream.of(
            Arguments.argumentSet("Happy path",
                "00012797",
                okJson(TWO_LOCATIONS_LIST).withHeader(X_TOTAL_COUNT, "2"),
                2
            ),
            Arguments.argumentSet(
                "Circuit Breaker",
                "00012798",
                notFound(),
                0
            )

        );
  }


}
