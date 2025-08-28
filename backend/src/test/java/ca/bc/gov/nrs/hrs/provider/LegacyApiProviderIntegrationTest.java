package ca.bc.gov.nrs.hrs.provider;

import static ca.bc.gov.nrs.hrs.provider.ForestClientApiProviderTestConstants.DISTRICT_CODES_JSON;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("Integrated Test | Legacy API Provider")
class LegacyApiProviderIntegrationTest extends AbstractTestContainerIntegrationTest {

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
  private LegacyApiProvider legacyApiProvider;

  @Test
  @DisplayName("Should fetch district codes successfully")
  void shouldFetchDistrictCodes() {

    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/codes/districts"))
            .willReturn(okJson(DISTRICT_CODES_JSON)));

    assertNotNull(legacyApiProvider.getDistrictCodes());
    assertFalse(legacyApiProvider.getDistrictCodes().isEmpty());
    assertEquals(23, legacyApiProvider.getDistrictCodes().size());
  }

  @Test
  @DisplayName("fallback district when unavailable")
  void shouldFetchDistrictCodesAndIsUnavailable() {

    clientApiStub.stubFor(
        get(urlPathEqualTo("/api/codes/districts"))
            .willReturn(serviceUnavailable()));

    assertNotNull(legacyApiProvider.getDistrictCodes());
    assertFalse(legacyApiProvider.getDistrictCodes().isEmpty());
    assertEquals(23, legacyApiProvider.getDistrictCodes().size());
  }
}