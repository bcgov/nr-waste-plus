package ca.bc.gov.nrs.hrs.provider.cognito;

import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Client that calls the Cognito {@code /oauth2/userInfo} endpoint to retrieve
 * identity attributes for the currently authenticated user.
 *
 * <p>Uses Spring's {@link RestClient} following the same provider pattern as
 * other API clients in the application. The Bearer access token from the
 * incoming request is forwarded as the {@code Authorization} header so
 * Cognito can resolve the user's identity.
 * </p>
 *
 * <p>All errors are caught and logged; the method returns
 * {@link Optional#empty()} rather than propagating exceptions so callers
 * can apply safe fallback behaviour.
 * </p>
 */
@Slf4j
@Component
@Observed
public class CognitoUserInfoClient {

  private static final String PROVIDER = "Cognito UserInfo";

  private final RestClient restClient;

  /**
   * Construct the client using the pre-configured {@code cognitoApi} REST client bean.
   *
   * @param cognitoApi the {@link RestClient} pre-configured with the Cognito userInfo base URL
   */
  public CognitoUserInfoClient(@Qualifier("cognitoApi") RestClient cognitoApi) {
    this.restClient = cognitoApi;
  }

  /**
   * Fetch user identity attributes from the Cognito userInfo endpoint.
   *
   * <p>The supplied {@code accessToken} is forwarded as a Bearer token.
   * On any error the method logs a warning and returns {@link Optional#empty()}.
   * </p>
   *
   * @param accessToken the raw OAuth2 access token value for the current request
   * @return an {@link Optional} containing a {@link CognitoUserInfoResponse} when
   *         the call succeeds, or empty on any failure
   */
  @NewSpan
  public Optional<CognitoUserInfoResponse> fetchUserInfo(String accessToken) {
    log.debug("Calling {} endpoint to retrieve user identity", PROVIDER);

    try {
      Map<String, Object> body = restClient
          .get()
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
          .retrieve()
          .body(new ParameterizedTypeReference<>() {
          });

      if (body == null) {
        log.warn("{} returned an empty response body", PROVIDER);
        return Optional.empty();
      }

      return Optional.of(mapResponse(body));

    } catch (RestClientException ex) {
      log.warn("Failed to fetch user info from {}: {}", PROVIDER, ex.getMessage());
      return Optional.empty();
    }
  }

  @SuppressWarnings("unchecked")
  private CognitoUserInfoResponse mapResponse(Map<String, Object> body) {
    List<String> groups = body.get("cognito:groups") instanceof List<?> rawList
        ? rawList.stream()
            .filter(String.class::isInstance)
            .map(String.class::cast)
            .toList()
        : List.of();

    return new CognitoUserInfoResponse(
        (String) body.get("sub"),
        (String) body.get("email"),
        (String) body.get("name"),
        (String) body.get("given_name"),
        (String) body.get("family_name"),
        (String) body.get("custom:idp_name"),
        (String) body.get("custom:idp_user_id"),
        (String) body.get("custom:idp_username"),
        (String) body.get("custom:idp_display_name"),
        (String) body.get("custom:idp_business_id"),
        groups,
        body
    );
  }
}

