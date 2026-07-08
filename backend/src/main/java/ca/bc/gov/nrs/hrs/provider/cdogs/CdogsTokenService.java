package ca.bc.gov.nrs.hrs.provider.cdogs;

import ca.bc.gov.nrs.hrs.configuration.HrsConfiguration;
import io.micrometer.observation.annotation.Observed;
import java.time.Instant;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Service that fetches and caches Keycloak client_credentials JWT tokens
 * for CDOGS authentication.
 *
 * <p>Caches the token for up to 80% of its configured lifetime to avoid
 * redundant network calls while ensuring a valid token is always available.</p>
 */
@Component
@Slf4j
@Observed
public class CdogsTokenService {

  private final RestClient tokenClient;
  private final HrsConfiguration.CdogsConfiguration cdogsConfig;
  private volatile String cachedToken;
  private volatile Instant tokenExpiry;

  public CdogsTokenService(HrsConfiguration configuration) {
    this.cdogsConfig = configuration.getCdogs();
    this.tokenClient = RestClient.builder()
        .baseUrl(cdogsConfig.getTokenUrl())
        .build();
  }

  /**
   * Returns a valid access token, fetching a new one if the cached token
   * is expired or has less than 20% of its lifetime remaining.
   *
   * @return a non-null Bearer access token
   */
  public synchronized String getAccessToken() {
    if (cachedToken != null && tokenExpiry != null) {
      long remaining = Instant.now().until(tokenExpiry, java.time.temporal.ChronoUnit.SECONDS);
      long threshold = (long) (cdogsConfig.getExpiresIn() * 0.2);
      if (remaining > threshold) {
        return cachedToken;
      }
      log.info("CDOGS token expired or nearing expiry — refreshing");
    }

    return fetchNewToken();
  }

  private String fetchNewToken() {
    LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "client_credentials");
    form.add("client_id", cdogsConfig.getClientId());
    form.add("client_secret", cdogsConfig.getClientSecret());

    Map<String, Object> response = tokenClient
        .post()
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .body(form)
        .retrieve()
        .body(new ParameterizedTypeReference<>() {});

    String token = (String) response.get("access_token");
    Object expiresInObj = response.get("expires_in");
    long expiresIn = expiresInObj instanceof Number n ? n.longValue() : cdogsConfig.getExpiresIn();

    this.cachedToken = token;
    this.tokenExpiry = Instant.now().plusSeconds(expiresIn);

    log.debug("CDOGS token acquired, expires in {}s", expiresIn);
    return token;
  }
}
