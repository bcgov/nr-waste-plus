package ca.bc.gov.nrs.hrs.health;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WiremockLogNotifier;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.health.contributor.Health;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@DisplayName("Integrated Test | CdogsHealthIndicator")
class CdogsHealthIndicatorIntegrationTest extends AbstractTestContainerIntegrationTest {

  private static final String TOKEN_PATH =
      "/auth/realms/test/protocol/openid-connect/token";

  @RegisterExtension
  static WireMockExtension cdogsStub =
      WireMockExtension.newInstance()
          .options(
              wireMockConfig()
                  .dynamicPort()
                  .notifier(new WiremockLogNotifier())
                  .asynchronousResponseEnabled(true)
                  .stubRequestLoggingDisabled(false))
          .configureStaticDsl(true)
          .build();

  @DynamicPropertySource
  static void overrideCdogsProperties(DynamicPropertyRegistry registry) {
    String baseUrl = "http://localhost:" + cdogsStub.getPort();
    registry.add("ca.bc.gov.nrs.cdogs.uri", () -> baseUrl);
    registry.add("ca.bc.gov.nrs.cdogs.token-url", () -> baseUrl + TOKEN_PATH);
  }

  @Autowired
  private CdogsHealthIndicator cdogsHealthIndicator;

  @BeforeEach
  void setUp() {
    cdogsStub.resetAll();
  }

  @Test
  @DisplayName("health returns up when token and health endpoints respond successfully")
  void health_shouldReturnUp_whenEndpointsRespond() {
    stubTokenResponse(200, "valid-token", 300);
    stubHealthResponse(200);

    Health health = cdogsHealthIndicator.health();

    assertThat(health.getStatus().getCode()).isEqualTo("UP");
  }

  @Test
  @DisplayName("health returns down when token endpoint fails")
  void health_shouldReturnDown_whenTokenEndpointFails() {
    stubTokenResponse(500, null, 0);

    Health health = cdogsHealthIndicator.health();

    assertThat(health.getStatus().getCode()).isEqualTo("DOWN");
  }

  @Test
  @DisplayName("health returns down when health endpoint returns non-200")
  void health_shouldReturnDown_whenHealthEndpointFails() {
    stubTokenResponse(200, "valid-token", 300);
    stubHealthResponse(500);

    Health health = cdogsHealthIndicator.health();

    assertThat(health.getStatus().getCode()).isEqualTo("DOWN");
  }

  @Test
  @DisplayName("health returns down when token endpoint is unreachable")
  void health_shouldReturnDown_whenTokenEndpointUnreachable() {
    // Don't stub the token endpoint → WireMock returns 404/stub not found
    Health health = cdogsHealthIndicator.health();

    assertThat(health.getStatus().getCode()).isEqualTo("DOWN");
  }

  private void stubTokenResponse(int status, String accessToken, long expiresIn) {
    String body;
    if (accessToken != null) {
      body = "{\"access_token\": \"" + accessToken + "\", \"expires_in\": " + expiresIn + "}";
    } else {
      body = "{}";
    }

    cdogsStub.stubFor(
        post(urlPathEqualTo(TOKEN_PATH))
            .willReturn(aResponse()
                .withStatus(status)
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
  }

  private void stubHealthResponse(int status) {
    cdogsStub.stubFor(
        get(urlPathEqualTo("/health"))
            .willReturn(aResponse().withStatus(status)));
  }
}
