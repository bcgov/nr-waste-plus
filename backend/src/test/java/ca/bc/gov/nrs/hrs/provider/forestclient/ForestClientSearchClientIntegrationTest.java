package ca.bc.gov.nrs.hrs.provider.forestclient;

import static ca.bc.gov.nrs.hrs.BackendConstants.X_TOTAL_COUNT;
import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.ONE_BY_VALUE_LIST;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("Integrated Test | Forest Client Search Client")
class ForestClientSearchClientIntegrationTest extends AbstractTestContainerIntegrationTest {

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
  private ForestClientSearchClient forestClientSearchClient;

  @BeforeEach
  public void resetCircuitBreaker() {
    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
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

    var clients = forestClientSearchClient.searchClients(page, size, value);
    Assertions.assertEquals(expectedSize, clients.getTotalElements());
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

    var clients = forestClientSearchClient.searchClientsByIds(page, size, List.of(value), null);
    Assertions.assertEquals(expectedSize, clients.size());
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
}

