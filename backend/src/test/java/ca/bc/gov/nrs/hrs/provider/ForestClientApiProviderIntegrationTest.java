package ca.bc.gov.nrs.hrs.provider;

import static ca.bc.gov.nrs.hrs.BackendConstants.X_TOTAL_COUNT;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.ONE_BY_VALUE_LIST;
import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.TWO_LOCATIONS_LIST;
import static com.github.tomakehurst.wiremock.client.WireMock.badRequest;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.notFound;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.status;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;

import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientStatusEnum;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientTypeEnum;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;


@DisplayName("Integrated Test | Forest Client API Provider")
class ForestClientApiProviderIntegrationTest extends AbstractTestContainerIntegrationTest {

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
  private CircuitBreakerRegistry circuitBreakerRegistry;
  @Autowired
  private RetryRegistry retryRegistry;

  @Autowired
  private ForestClientApiProvider forestClientApiProvider;

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
      ResponseDefinitionBuilder stubResponse
  ) {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/findByClientNumber/" + clientNumber))
            .willReturn(stubResponse));

    Optional<ForestClientDto> clientDto = forestClientApiProvider.fetchClientByNumber(clientNumber);

    if (clientDto.isPresent()) {
      ForestClientDto forestClient = clientDto.get();
      Assertions.assertEquals("00012797", forestClient.clientNumber());
      Assertions.assertEquals("MINISTRY OF FORESTS", forestClient.clientName());
      Assertions.assertNull(forestClient.legalFirstName());
      Assertions.assertNull(forestClient.legalMiddleName());
      Assertions.assertEquals(ForestClientStatusEnum.ACTIVE, forestClient.clientStatusCode());
      Assertions.assertEquals(
          ForestClientTypeEnum.MINISTRY_OF_FORESTS_AND_RANGE, forestClient.clientTypeCode());
      Assertions.assertEquals("MOF", forestClient.acronym());
    } else {
      Assertions.assertEquals(Optional.empty(), clientDto);
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
  ) {

    clientApiStub.stubFor(get(urlPathEqualTo("/clients/search/by")).willReturn(stub));

    var clients = forestClientApiProvider.searchClients(page, size, value);
    Assertions.assertEquals(expectedSize, clients.getTotalElements());
  }

  @ParameterizedTest
  @MethodSource("fetchClientLocations")
  @DisplayName("Fetch client locations should succeed")
  void fetchClientLocations_shouldSucceed(
      String clientNumber,
      ResponseDefinitionBuilder stub,
      long size
  ) {

    clientApiStub.stubFor(
        get(urlPathEqualTo("/clients/" + clientNumber + "/locations"))
            .willReturn(stub)
    );

    var locations = forestClientApiProvider.fetchLocationsByClientNumber(clientNumber);

    Assertions.assertEquals(size, locations.getTotalElements());
  }

  @ParameterizedTest
  @MethodSource("searchClients")
  @DisplayName("Search clients by list of ids")
  void shouldSearchClientsByIds(
      int page,
      int size,
      String value,
      ResponseDefinitionBuilder stub,
      long expectedSize
  ) {

    clientApiStub.stubFor(get(urlPathEqualTo("/clients/search")).willReturn(stub));

    var clients = forestClientApiProvider.searchClientsByIds(page, size, List.of(value), null);
    Assertions.assertEquals(expectedSize, clients.size());
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

  private static Stream<Arguments> fetchClientByNumber() {
    return Stream.of(
        Arguments.argumentSet(
            "Happy path",
            "00012797",
            okJson(CLIENTNUMBER_RESPONSE)
        ),
        Arguments.argumentSet(
            "Not found breaker",
            "00012898",
            notFound()
        ),
        Arguments.argumentSet(
            "Unavailable breaker",
            "00012898",
            serviceUnavailable()
        ),
        Arguments.argumentSet(
            "Rate limiter breaker",
            "00012898",
            status(429)
        ),
        Arguments.argumentSet(
            "Bad request breaker",
            "00012898",
            badRequest()
        )
    );
  }

}