package ca.bc.gov.nrs.hrs.provider.legacy;

import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.EMPTY_JSON;
import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.MY_FOREST_CLIENTS_LEGACY;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

@DisplayName("Integrated Test | Legacy My Forest Client Client")
class LegacyMyForestClientClientIntegrationTest extends AbstractTestContainerIntegrationTest {

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
  private LegacyMyForestClientClient legacyMyForestClientClient;

  @BeforeEach
  void setUp() {
    clientApiStub.resetAll();

    CircuitBreaker breaker = circuitBreakerRegistry.circuitBreaker("breaker");
    breaker.reset();
    RetryConfig retry = retryRegistry.retry("apiRetry").getRetryConfig();
    retryRegistry.remove("apiRetry");
    retryRegistry.retry("apiRetry", retry);
  }

  @Test
  @DisplayName("Search my forest clients should return paged content")
  void searchMyClients_shouldReturnPagedContent() {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/search/my-forest-clients"))
            .willReturn(okJson(MY_FOREST_CLIENTS_LEGACY))
    );

    var result = legacyMyForestClientClient.searchMyClients(
        Set.of("00012797"),
        PageRequest.of(0, 10)
    );

    assertNotNull(result);
    assertEquals(1, result.getContent().size());
    assertEquals("00012797", result.getContent().get(0).client().code());
  }

  @Test
  @DisplayName("Search my forest clients should fallback when service unavailable")
  void searchMyClients_shouldFallbackWhenUnavailable() {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/search/my-forest-clients"))
            .willReturn(serviceUnavailable())
    );

    var result = legacyMyForestClientClient.searchMyClients(
        Set.of("00012797"),
        PageRequest.of(0, 10)
    );

    assertNotNull(result);
    assertEquals(0, result.getContent().size());
  }

  @Test
  @DisplayName("Search my forest clients should return empty for invalid paged payload")
  void searchMyClients_shouldReturnEmptyForInvalidPayload() {
    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/search/my-forest-clients"))
            .willReturn(okJson(EMPTY_JSON))
    );

    var result = legacyMyForestClientClient.searchMyClients(
        Set.of("00012797"),
        PageRequest.of(0, 10)
    );

    assertNotNull(result);
    assertEquals(0, result.getContent().size());
  }
}

