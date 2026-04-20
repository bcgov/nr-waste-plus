package ca.bc.gov.nrs.hrs.provider.cognito;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@DisplayName("Unit Test | CognitoUserInfoClient")
class CognitoUserInfoClientTest {

  private final RestClient restClient = mock(RestClient.class);
  private final RestClient.RequestHeadersUriSpec<?> requestHeadersUriSpec =
      mock(RestClient.RequestHeadersUriSpec.class);
  private final RestClient.RequestHeadersSpec<?> requestHeadersSpec =
      mock(RestClient.RequestHeadersSpec.class);
  private final RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

  private final CognitoUserInfoClient client = new CognitoUserInfoClient(restClient);

  @Test
  @DisplayName("maps user info response including custom attributes and groups")
  void shouldMapUserInfoResponse() {
    Map<String, Object> body = new HashMap<>();
    body.put("sub", "sub-123");
    body.put("email", "user@example.com");
    body.put("name", "Jane Doe");
    body.put("given_name", "Jane");
    body.put("family_name", "Doe");
    body.put("custom:idp_name", "idir");
    body.put("custom:idp_user_id", "JD123");
    body.put("custom:idp_username", "jdoe");
    body.put("custom:idp_display_name", "Doe, Jane");
    body.put("custom:idp_business_id", "BUS-1");
    body.put("cognito:groups", Arrays.asList("group-a", 10, "group-b", null));
    mockRestChain("access-token", body);

    Optional<CognitoUserInfoResponse> result = client.fetchUserInfo("access-token");

    assertThat(result).isPresent();
    assertThat(result.orElseThrow().sub()).isEqualTo("sub-123");
    assertThat(result.orElseThrow().email()).isEqualTo("user@example.com");
    assertThat(result.orElseThrow().idpName()).isEqualTo("idir");
    assertThat(result.orElseThrow().groups()).containsExactly("group-a", "group-b");
    assertThat(result.orElseThrow().rawAttributes()).containsEntry("sub", "sub-123");
  }

  @Test
  @DisplayName("returns empty when Cognito returns null body")
  void shouldReturnEmptyWhenBodyIsNull() {
    mockRestChain("access-token", null);

    Optional<CognitoUserInfoResponse> result = client.fetchUserInfo("access-token");

    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("returns empty when Cognito request throws RestClientException")
  void shouldReturnEmptyOnRestClientException() {
    doReturn(requestHeadersUriSpec).when(restClient).get();
    doReturn(requestHeadersSpec)
        .when(requestHeadersUriSpec)
        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token");
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.body(any(ParameterizedTypeReference.class)))
        .thenThrow(new RestClientException("boom"));

    Optional<CognitoUserInfoResponse> result = client.fetchUserInfo("access-token");

    assertThat(result).isEmpty();
  }

  @Test
  @DisplayName("uses empty groups when cognito:groups is not a list")
  void shouldUseEmptyGroupsWhenClaimIsNotAList() {
    Map<String, Object> body = Map.of(
        "sub", "sub-123",
        "cognito:groups", "not-a-list"
    );
    mockRestChain("access-token", body);

    Optional<CognitoUserInfoResponse> result = client.fetchUserInfo("access-token");

    assertThat(result).isPresent();
    assertThat(result.orElseThrow().groups()).isEmpty();
  }

  @SuppressWarnings({"rawtypes", "unchecked"})
  private void mockRestChain(String accessToken, Map<String, Object> body) {
    doReturn(requestHeadersUriSpec).when(restClient).get();
    doReturn(requestHeadersSpec)
        .when(requestHeadersUriSpec)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
    when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(body);
  }
}

