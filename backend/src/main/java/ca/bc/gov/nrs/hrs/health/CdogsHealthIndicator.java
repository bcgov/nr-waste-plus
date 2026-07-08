package ca.bc.gov.nrs.hrs.health;

import ca.bc.gov.nrs.hrs.configuration.HrsConfiguration;
import io.micrometer.observation.annotation.Observed;
import java.net.http.HttpClient;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Health indicator for the CDOGS (Common Document Generation Service) backend.
 *
 * <p>Acquires an OAuth2 client-credentials token from the configured token endpoint,
 * then performs a {@code GET /health} request against the CDOGS API. Returns
 * {@link Health#up()} when the service responds successfully; returns
 * {@link Health#down(Throwable)} on any communication failure.</p>
 *
 * @since 1.0.0
 */
@Component
@Slf4j
@Observed
public class CdogsHealthIndicator implements HealthIndicator {

  private final RestClient cdogsApi;
  private final RestClient cdogsTokenApi;
  private final HrsConfiguration.CdogsConfiguration cdogsConfig;

  /**
   * Constructs a {@code CdogsHealthIndicator} and pre-builds the token client.
   *
   * <p>The token {@link RestClient} is built once at construction time using the
   * token URL from {@link HrsConfiguration.CdogsConfiguration#getTokenUrl()}.
   * The API {@link RestClient} is injected via the {@code cdogsApi} qualifier.</p>
   *
   * @param cdogsApi      pre-configured {@link RestClient} targeting the CDOGS API base URL
   * @param configuration application configuration supplying the CDOGS service properties
   */
  public CdogsHealthIndicator(
      @Qualifier("cdogsApi") RestClient cdogsApi,
      HrsConfiguration configuration
  ) {
    this.cdogsApi = cdogsApi;
    this.cdogsConfig = configuration.getCdogs();
    HttpClient httpClient = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .build();
    this.cdogsTokenApi = RestClient.builder()
        .baseUrl(cdogsConfig.getTokenUrl())
        .requestFactory(new JdkClientHttpRequestFactory(httpClient))
        .build();
  }

  /**
   * Checks CDOGS availability by acquiring a token and calling {@code GET /health}.
   *
   * <p>Performs an OAuth2 client-credentials token exchange against the configured
   * token endpoint, then issues a {@code GET /health} request with the resulting
   * Bearer token. Returns {@link Health#up()} on a successful response, or
   * {@link Health#down(Throwable)} if any exception occurs during the exchange.</p>
   *
   * @return {@link Health#up()} when CDOGS is reachable and healthy;
   *         {@link Health#down(Throwable)} otherwise
   */
  @Override
  public Health health() {
    try {
      String token = acquireToken();
      cdogsApi
          .get()
          .uri("/health")
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
          .retrieve()
          .toBodilessEntity();
      return Health.up().build();
    } catch (Exception e) {
      log.error("CDOGS health check failed", e);
      return Health.down(e).build();
    }
  }

  private String acquireToken() {
    LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "client_credentials");
    form.add("client_id", cdogsConfig.getClientId());
    form.add("client_secret", cdogsConfig.getClientSecret());

    Map<String, Object> response = cdogsTokenApi
        .post()
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .body(form)
        .retrieve()
        .body(new ParameterizedTypeReference<>() {});
    return (String) response.get("access_token");
  }
}
