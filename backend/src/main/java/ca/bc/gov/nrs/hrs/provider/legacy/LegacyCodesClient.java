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
 * 
 * <p>This component handles all communication with legacy API code endpoints, including district,
 * sampling, and assessment area status codes. It implements resilience patterns via circuit
 * breaker to gracefully handle failures by returning fallback values.
 * </p>
 * 
 * <p>All methods are annotated with
 * {@link io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker} to provide automatic
 * fault tolerance, falling back to default or empty lists when the legacy API is unavailable.
 * </p>
 *
 */
@Slf4j
@Component
@Observed
public class LegacyCodesClient {

  static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private static final String PROVIDER = "Legacy API";

  private final RestClient restClient;

  /**
   * Constructs a new LegacyCodesClient.
   *
   * @param legacyApi the qualified RestClient bean for the legacy API, must not be null
   */
  LegacyCodesClient(@Qualifier("legacyApi") RestClient legacyApi) {
    this.restClient = legacyApi;
  }

  /**
   * Retrieve all district codes from the legacy API.
   * 
   * <p>Fetches a list of all available district codes with their descriptions. This method
   * is protected by a circuit breaker that will return {@link LegacyApiConstants#DEFAULT_DISTRICTS}
   * if the API is unavailable or fails.
   * </p>
   * 
   * <p>The legacy API endpoint is: {@code GET /api/codes/districts}
   * </p>
   * 
   * @return a list of {@link CodeDescriptionDto} representing all available districts;
   *         never null, defaults to {@link LegacyApiConstants#DEFAULT_DISTRICTS} if API fails
   * @see LegacyApiConstants#DEFAULT_DISTRICTS
   */
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

  /**
   * Retrieve all sampling codes from the legacy API.
   * 
   * <p>Fetches a list of all available sampling codes with their descriptions. This method
   * is protected by a circuit breaker that will return an empty list if the API is
   * unavailable or fails.
   * </p>
   * 
   * <p>The legacy API endpoint is: {@code GET /api/codes/samplings}
   * </p>
   * 
   * @return a list of {@link CodeDescriptionDto} representing all available sampling codes;
   *         never null, defaults to empty list if API fails
   * 
   * @see LegacyApiConstants#CODE_LIST
   */
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

  /**
   * Retrieve all assessment area status codes from the legacy API.
   * 
   * <p>Fetches a list of all available status codes for assessment areas with their descriptions.
   * This method is protected by a circuit breaker that will return an empty list if the API
   * is unavailable or fails.
   * </p>
   * 
   * <p>The legacy API endpoint is: {@code GET /api/codes/assess-area-statuses}
   * </p>
   * 
   * @return a list of {@link CodeDescriptionDto} representing all available assessment
   *         area status codes; never null, defaults to empty list if API fails
   * 
   * @see LegacyApiConstants#CODE_LIST
   */
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

  /**
   * Fallback method invoked when the legacy API fails to provide district codes.
   * 
   * <p>Returns a predefined list of default districts to ensure the application continues
   * operating even when the API is unavailable.
   * </p>
   * 
   * @param throwable the exception that triggered the fallback, may be null
   * @return the default list of districts from {@link LegacyApiConstants#DEFAULT_DISTRICTS}
   */
  @SuppressWarnings("unused")
  private List<CodeDescriptionDto> fallbackDistricts(Throwable throwable) {
    logFallbackError(throwable);
    return LegacyApiConstants.DEFAULT_DISTRICTS;
  }

  /**
   * Fallback method invoked when the legacy API fails to provide any code list.
   * 
   * <p>Returns an empty list to allow the application to continue operating when the API
   * is unavailable for sampling codes or status codes.
   * </p>
   * 
   * @param throwable the exception that triggered the fallback, may be null
   * @return an empty list from {@link LegacyApiConstants#CODE_LIST}
   */
  @SuppressWarnings("unused")
  private List<CodeDescriptionDto> fallbackEmptyList(Throwable throwable) {
    logFallbackError(throwable);
    return LegacyApiConstants.CODE_LIST;
  }

  /**
   * Logs fallback errors for debugging and monitoring purposes.
   * 
   * <p>This method standardizes error logging when circuit breaker fallbacks are triggered.
   * </p>
   * 
   * @param throwable the exception that occurred, may be null if reason is unknown
   */
  private void logFallbackError(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable == null ? "unknown" : throwable.getMessage());
  }
}


