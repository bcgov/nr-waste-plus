package ca.bc.gov.nrs.hrs.provider.legacy;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Client responsible for legacy code-list endpoints.
 */
@Slf4j
@Component
@Observed
public class LegacyCodesClient {

  static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private static final String PROVIDER = "Legacy API";

  private final RestClient restClient;

  LegacyCodesClient(@Qualifier("legacyApi") RestClient legacyApi) {
    this.restClient = legacyApi;
  }

  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackDistricts")
  @NewSpan
  public List<CodeDescriptionDto> getDistrictCodes() {
    log.info("Starting {} request to /codes/districts", PROVIDER);
    return restClient
        .get()
        .uri("/api/codes/districts")
        .retrieve()
        .body(new ParameterizedTypeReference<>() {
        });
  }

  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackEmptyList")
  @NewSpan
  public List<CodeDescriptionDto> getSamplingCodes() {
    log.info("Starting {} request to /codes/samplings", PROVIDER);
    return restClient
        .get()
        .uri("/api/codes/samplings")
        .retrieve()
        .body(new ParameterizedTypeReference<>() {
        });
  }

  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackEmptyList")
  @NewSpan
  public List<CodeDescriptionDto> getStatusCodes() {
    log.info("Starting {} request to /codes/assess-area-statuses", PROVIDER);
    return restClient
        .get()
        .uri("/api/codes/assess-area-statuses")
        .retrieve()
        .body(new ParameterizedTypeReference<>() {
        });
  }

  @SuppressWarnings("unused")
  private List<CodeDescriptionDto> fallbackDistricts(Throwable throwable) {
    logFallbackError(throwable);
    return LegacyApiConstants.DEFAULT_DISTRICTS;
  }

  @SuppressWarnings("unused")
  private List<CodeDescriptionDto> fallbackEmptyList(Throwable throwable) {
    logFallbackError(throwable);
    return LegacyApiConstants.CODE_LIST;
  }

  private void logFallbackError(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable == null ? "unknown" : throwable.getMessage());
  }
}


