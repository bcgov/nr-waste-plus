package ca.bc.gov.nrs.hrs.provider.legacy;

import static ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProviderTestConstants.DISTRICT_CODES_JSON;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.serviceUnavailable;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
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

@DisplayName("Integrated Test | Legacy Codes Client")
class LegacyCodesClientIntegrationTest extends AbstractTestContainerIntegrationTest {

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
  private LegacyCodesClient legacyCodesClient;

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
  @DisplayName("Should fetch district codes successfully")
  void shouldFetchDistrictCodes() {

    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/codes/districts"))
            .willReturn(okJson(DISTRICT_CODES_JSON)));

    assertNotNull(legacyCodesClient.getDistrictCodes());
    assertFalse(legacyCodesClient.getDistrictCodes().isEmpty());
    assertEquals(23, legacyCodesClient.getDistrictCodes().size());
  }

  @Test
  @DisplayName("Fallback districts when service is unavailable")
  void shouldFallbackDistrictCodesWhenUnavailable() {

    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/codes/districts"))
            .willReturn(serviceUnavailable()));

    assertNotNull(legacyCodesClient.getDistrictCodes());
    assertFalse(legacyCodesClient.getDistrictCodes().isEmpty());
    assertEquals(23, legacyCodesClient.getDistrictCodes().size());
  }
}

