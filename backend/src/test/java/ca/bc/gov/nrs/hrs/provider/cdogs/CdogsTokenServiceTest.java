package ca.bc.gov.nrs.hrs.provider.cdogs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.configuration.HrsConfiguration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test | CdogsTokenService")
class CdogsTokenServiceTest {

  @Mock
  private HrsConfiguration configuration;

  @Mock
  private HrsConfiguration.CdogsConfiguration cdogsConfig;

  private CdogsTokenService tokenService;

  private final RestClient tokenClient = mock(RestClient.class);
  private final RestClient.RequestBodyUriSpec requestBodyUriSpec =
      mock(RestClient.RequestBodyUriSpec.class);
  private final RestClient.RequestBodySpec requestBodySpec =
      mock(RestClient.RequestBodySpec.class);
  private final RestClient.ResponseSpec responseSpec =
      mock(RestClient.ResponseSpec.class);

  @BeforeEach
  void setUp() {
    when(configuration.getCdogs()).thenReturn(cdogsConfig);
    when(cdogsConfig.getTokenUrl()).thenReturn("https://token.example.com/auth");
    when(cdogsConfig.getClientId()).thenReturn("test-client");
    when(cdogsConfig.getClientSecret()).thenReturn("test-secret");

    // Construct the service manually so we control configuration
    tokenService = new CdogsTokenService(configuration);

    // Replace the internally-built RestClient with our mock
    ReflectionTestUtils.setField(tokenService, "tokenClient", tokenClient);
  }

  @Test
  @DisplayName("first call fetches new token and caches it")
  void shouldFetchNewToken_onFirstCall() {
    mockTokenResponse("first-token", 300);

    String token = tokenService.getAccessToken();

    assertThat(token).isEqualTo("first-token");
    verifyTokenRequest();
  }

  @Test
  @DisplayName("second call within expiry returns cached token without network call")
  void shouldReturnCachedToken_withinExpiry() {
    mockTokenResponse("cached-token", 300);

    // First call — fetches token
    String firstToken = tokenService.getAccessToken();
    assertThat(firstToken).isEqualTo("cached-token");

    // Second call — should return cached token
    String secondToken = tokenService.getAccessToken();
    assertThat(secondToken).isEqualTo("cached-token");

    // The RestClient should only have been called once
    verify(tokenClient, times(1)).post();
  }

  @Test
  @DisplayName("expired token triggers refresh on next call")
  void shouldRefreshToken_whenExpired() {
    // First call with short expiry (1 second)
    mockTokenResponse("first-token", 1);

    String firstToken = tokenService.getAccessToken();
    assertThat(firstToken).isEqualTo("first-token");

    // Wait for token to expire
    sleep(1100);

    // Second call — should refresh
    mockTokenResponse("refreshed-token", 300);
    String secondToken = tokenService.getAccessToken();
    assertThat(secondToken).isEqualTo("refreshed-token");

    verify(tokenClient, times(2)).post();
  }

  @Test
  @DisplayName("nearly-expired token (below 20% threshold) triggers refresh")
  void shouldRefreshToken_whenNearingExpiry() {
    // Use a very short expiry so even the threshold triggers refresh
    // expiresIn=5s, threshold=1s → token will effectively be near-expiry
    when(cdogsConfig.getExpiresIn()).thenReturn(5L);

    // Re-inject config change by re-setting the config reference
    mockTokenResponse("first-token", 5);

    String firstToken = tokenService.getAccessToken();
    assertThat(firstToken).isEqualTo("first-token");

    // Wait slightly more than 80% of 5s = 4s → token should be near-expired
    sleep(4500);

    mockTokenResponse("refreshed-token", 300);
    String secondToken = tokenService.getAccessToken();
    assertThat(secondToken).isEqualTo("refreshed-token");

    verify(tokenClient, times(2)).post();
  }

  @Test
  @DisplayName("synchronized behavior prevents concurrent token fetches")
  void shouldSynchronizeConcurrentCalls() throws Exception {
    mockTokenResponse("sync-token", 300);

    int threadCount = 10;
    CountDownLatch latch = new CountDownLatch(threadCount);
    AtomicInteger successCount = new AtomicInteger(0);

    for (int i = 0; i < threadCount; i++) {
      Thread thread = new Thread(() -> {
        String token = tokenService.getAccessToken();
        if ("sync-token".equals(token)) {
          successCount.incrementAndGet();
        }
        latch.countDown();
      });
      thread.start();
    }

    latch.await();

    // All threads should get the same token
    assertThat(successCount.get()).isEqualTo(threadCount);
    // Only one actual network call should have been made
    verify(tokenClient, times(1)).post();
  }

  @Test
  @DisplayName("uses custom expires_in from token response when present")
  void shouldUseCustomExpiresIn_fromTokenResponse() {
    Map<String, Object> body = Map.of(
        "access_token", "custom-expiry-token",
        "expires_in", 600
    );

    doReturn(requestBodyUriSpec).when(tokenClient).post();
    doReturn(requestBodySpec).when(requestBodyUriSpec)
        .contentType(MediaType.APPLICATION_FORM_URLENCODED);
    doReturn(requestBodySpec).when(requestBodySpec).body(any(LinkedMultiValueMap.class));
    when(requestBodySpec.retrieve()).thenReturn(responseSpec);
    doReturn(body).when(responseSpec).body(ArgumentMatchers.<ParameterizedTypeReference<Map<String, Object>>>any());

    String token = tokenService.getAccessToken();
    assertThat(token).isEqualTo("custom-expiry-token");

    // Should still be cached on second call (expires_in=600 means
    // threshold=120s, so the token is valid for a while)
    String secondToken = tokenService.getAccessToken();
    assertThat(secondToken).isEqualTo("custom-expiry-token");

    verify(tokenClient, times(1)).post();
  }

  private void mockTokenResponse(String accessToken, long expiresIn) {
    Map<String, Object> body = Map.of(
        "access_token", accessToken,
        "expires_in", expiresIn
    );

    doReturn(requestBodyUriSpec).when(tokenClient).post();
    doReturn(requestBodySpec).when(requestBodyUriSpec)
        .contentType(MediaType.APPLICATION_FORM_URLENCODED);
    doReturn(requestBodySpec).when(requestBodySpec).body(any(LinkedMultiValueMap.class));
    when(requestBodySpec.retrieve()).thenReturn(responseSpec);
    doReturn(body).when(responseSpec).body(ArgumentMatchers.<ParameterizedTypeReference<Map<String, Object>>>any());
  }

  private void verifyTokenRequest() {
    verify(tokenClient).post();
    verify(requestBodyUriSpec).contentType(MediaType.APPLICATION_FORM_URLENCODED);
    verify(requestBodySpec).body(any(LinkedMultiValueMap.class));
    verify(requestBodySpec).retrieve();
  }

  private static void sleep(long millis) {
    try {
      Thread.sleep(millis);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
