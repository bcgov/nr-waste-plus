package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.BackendConstants;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientLocationDto;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.exception.RetriableException;
import ca.bc.gov.nrs.hrs.exception.TooManyRequestsException;
import ca.bc.gov.nrs.hrs.exception.UnretriableException;
import ca.bc.gov.nrs.hrs.util.UriUtils;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

/**
 * Provider that integrates with the external ForestClient API.
 *
 * <p>
 * Contains methods to fetch clients, locations and perform searches against
 * the downstream ForestClient service. Resilience (retry/circuit breaker)
 * and response handling are applied where appropriate.
 * </p>
 */
@Slf4j
@Component
@Observed
public class ForestClientApiProvider {

  private final RestClient restClient;

  private static final String PROVIDER = "ForestClient API";

  ForestClientApiProvider(@Qualifier("forestClientApi") RestClient forestClientApi) {
    this.restClient = forestClientApi;
  }

  /**
   * Fetch a ForestClient by its number.
   *
   * <p>
   * Handles downstream response status codes mapping them to appropriate
   * domain exceptions (404 -> {@link ForestClientNotFoundException}, 429 ->
   * {@link TooManyRequestsException}, 4xx -> {@link UnretriableException},
   * 5xx -> {@link RetriableException}).
   * </p>
   *
   * @param number the client number to search for
   * @return an {@link Optional} containing the {@link ForestClientDto} if found
   */
  @Retry(name = "apiRetry", fallbackMethod = "fetchClientByNumberFallBack")
  @NewSpan
  public Optional<ForestClientDto> fetchClientByNumber(String number) {

    log.info("Starting {} request to /clients/findByClientNumber/{}", PROVIDER, number);

    return Optional.ofNullable(
        restClient
            .get()
            .uri("/clients/findByClientNumber/{number}", number)
            .retrieve()
            .onStatus(status -> status.value() == 404,
                (req, res) -> {
                  log.error("Finished {} request - Client error: {}", PROVIDER,
                      res.getStatusCode());
                  throw new ForestClientNotFoundException(number);
                }
            )
            .onStatus(status -> status.value() == 429,
                (req, res) -> {
                  log.warn("Rate limit hit when fetching {}, status 429", number);
                  String retryAfter = res.getHeaders().getFirst("Retry-After");
                  throw new TooManyRequestsException("Forest Client", retryAfter);
                }
            )
            .onStatus(HttpStatusCode::is4xxClientError,
                (req, res) -> {
                  log.error("Unhandled 4xx error: {}", res.getStatusCode());
                  throw new UnretriableException(res.getStatusCode(), number);
                }
            )
            .onStatus(HttpStatusCode::is5xxServerError,
                (req, res) -> {
                  log.error("Finished {} request - Server error: {}", PROVIDER,
                      res.getStatusCode());
                  throw new RetriableException(res.getStatusCode(), res.getStatusText());
                }
            )
            .body(ForestClientDto.class)
    );
  }

  /**
   * Search client by name, acronym or number.
   *
   * <p>
   * Returns a pageable result of {@link ForestClientDto}. The total count is
   * read from the {@code X-Total-Count} response header.
   * </p>
   *
   * @param page pagination page
   * @param size pagination size
   * @param value search value for name/acronym/number
   * @return a {@link Page} of {@link ForestClientDto}
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "paginatedFallback")
  @NewSpan
  public Page<ForestClientDto> searchClients(
      int page,
      int size,
      String value
  ) {
    log.info("Starting {} request to /clients/search/by?name={}&acronym={}&number={}",
        PROVIDER,
        value,
        value,
        value
    );

    ResponseEntity<List<ForestClientDto>> response =
        restClient
            .get()
            .uri(uriBuilder ->
                uriBuilder
                    .path("/clients/search/by")
                    .queryParam("page", page)
                    .queryParam("size", size)
                    .queryParam("name", value)
                    .queryParam("acronym", value)
                    .queryParam("number", value)
                    .build()
            )
            .retrieve()
            .toEntity(new ParameterizedTypeReference<>() {
            });

    if (response.getStatusCode().is2xxSuccessful()) {
      return new PageImpl<>(
          response.getBody() != null ? response.getBody() : List.of(),
          PageRequest.of(page, size),
          Long.parseLong(
              Objects.toString(
                  response.getHeaders().getFirst(BackendConstants.X_TOTAL_COUNT),
                  "0"
              )
          )
      );
    }

    return paginatedFallback(page, size, value, new RuntimeException(
        "Failed to fetch clients with status: " + response.getStatusCode())
    );

  }

  /**
   * Fetch all locations for a client.
   *
   * <p>
   * Returns a pageable list of {@link ForestClientLocationDto}. On 404 the
   * call throws {@link ForestClientNotFoundException}.
   * </p>
   *
   * @param clientNumber client number to lookup
   * @return a pageable list of locations for the client
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "paginatedFallback")
  @NewSpan
  public Page<ForestClientLocationDto> fetchLocationsByClientNumber(String clientNumber) {
    log.info("Starting {} request to /clients/{}/locations", PROVIDER, clientNumber);

    ResponseEntity<List<ForestClientLocationDto>> response = restClient
        .get()
        .uri(uriBuilder ->
            uriBuilder
                .path("/clients/{clientNumber}/locations")
                .queryParam("page", 0)
                .queryParam("size", 100)
                .build(clientNumber)
        )
        .retrieve()
        .onStatus(status -> status.value() == 404,
            (req, res) -> {
              log.error("{} request - Client error: {}", PROVIDER,
                  res.getStatusCode());
              throw new ForestClientNotFoundException(clientNumber);
            }
        )
        .toEntity(new ParameterizedTypeReference<>() {
        });

    if (response.getStatusCode().is2xxSuccessful()) {
      return new PageImpl<>(
          response.getBody() != null ? response.getBody() : List.of(),
          PageRequest.of(0, 50),
          Long.parseLong(
              Objects.toString(
                  response.getHeaders().getFirst(BackendConstants.X_TOTAL_COUNT),
                  "0"
              )
          )
      );
    }

    return paginatedFallback(0, 50, clientNumber, new RuntimeException(
        "Failed to fetch client locations with status: " + response.getStatusCode())
    );
  }

  /**
   * Circuit breaker protected method to fetch a specific client location by client number and
   * location code.
   * @param clientNumber client number to lookup
   * @param locationCode location code to lookup
   * @return an {@link Optional} containing the {@link ForestClientLocationDto} if found
   */
  @CircuitBreaker(
      name = "breaker",
      fallbackMethod = "locationByClientNumberAndLocationCodeFallback"
  )
  @NewSpan
  public Optional<ForestClientLocationDto> fetchLocationByClientNumberAndLocationCode(
      String clientNumber,
      String locationCode
  ) {
    log.info("Starting {} request to /clients/{}/locations/{}", PROVIDER, clientNumber,
        locationCode);

    try {
      return
          Optional
              .ofNullable(
                  restClient
                      .get()
                      .uri("/clients/{clientNumber}/locations/{locationCode}", clientNumber,
                          locationCode)
                      .retrieve()
                      .body(ForestClientLocationDto.class)
              );
    } catch (HttpClientErrorException | HttpServerErrorException httpExc) {
      log.error("Client location {} request - Response code error: {}",
          PROVIDER,
          httpExc.getStatusCode()
      );
    }

    return Optional.empty();
  }

  /**
   * Search clients by a list of IDs with optional name filter.
   * @param page Page number
   * @param size Number of items per page
   * @param values List of client IDs to search
   * @param name Optional name filter
   * @return List of matching ForestClientDto
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "searchClientsByIdsFallback")
  @NewSpan
  public List<ForestClientDto> searchClientsByIds(
      int page,
      int size,
      List<String> values,
      String name
  ) {
    try {
      log.info("Starting {} request to /clients/search", PROVIDER);

      return restClient
          .get()
          .uri(uriBuilder ->
              uriBuilder
                  .path("/clients/search")
                  .queryParam("page", page)
                  .queryParam("size", size)
                  .queryParams(UriUtils.buildMultiValueQueryParam("id", values))
                  .queryParamIfPresent("name", Optional.ofNullable(name))
                  .build(Map.of())
          )
          .retrieve()
          .body(new ParameterizedTypeReference<>() {
          });
    } catch (HttpClientErrorException | HttpServerErrorException httpExc) {
      log.error(
          "{} requested on search by - Response code error: {} with body: {}",
          PROVIDER,
          httpExc.getStatusCode(),
          httpExc.getResponseBodyAsString());
    }

    return List.of();
  }

  @SuppressWarnings("unused")
  private Optional<ForestClientDto> fetchClientByNumberFallBack(String number, Throwable ex) {
    logFallbackWarn("fetchClientByNumber", ex);
    return Optional.empty();
  }

  @SuppressWarnings("unused")
  private <T> Page<T> paginatedFallback(
      int page,
      int size,
      String value,
      Throwable ex
  ) {
    logFallbackWarn("searchClients", ex);
    List<T> empty = Collections.emptyList();
    return new PageImpl<>(empty, PageRequest.of(page, size), 0);
  }

  private <T> Page<T> paginatedFallback(
      String value,
      Throwable ex
  ) {
    return paginatedFallback(0, 10, value, ex);
  }

  @SuppressWarnings("unused")
  private Optional<ForestClientLocationDto> locationByClientNumberAndLocationCodeFallback(
      String clientNumber,
      String locationCode,
      Throwable ex
  ) {
    logFallbackWarn("locationByClientNumberAndLocationCode", ex);
    return Optional.empty();
  }

  @SuppressWarnings("unused")
  private List<ForestClientDto> searchClientsByIdsFallback(
      int page,
      int size,
      List<String> values,
      String name,
      Throwable ex
  ){
    logFallbackWarn("searchClientsByIds", ex);
    return ForestClientConstants.EMPTY_FOREST_CLIENT_LIST;
  }

  // Centralized fallback logger to reduce repeated code
  private void logFallbackWarn(String method, Throwable ex) {
    log.warn("Fallback for {} for {} due to {}.",
        method,
        PROVIDER,
        ex == null ? "unknown" : ex.toString()
    );
  }

}
