package ca.bc.gov.nrs.hrs.provider.forestclient;

import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.CLIENTNUMBER_RESPONSE;
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

@DisplayName("Integrated Test | Forest Client Fetch Client")
class ForestClientFetchClientIntegrationTest extends AbstractTestContainerIntegrationTest {

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
  private ForestClientFetchClient forestClientFetchClient;

  @BeforeEach
  void resetCircuitBreaker() {
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

    Optional<ForestClientDto> clientDto =
        forestClientFetchClient.fetchClientByNumber(clientNumber);

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

