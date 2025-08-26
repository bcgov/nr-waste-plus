package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.BackendConstants;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientLocationDto;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.exception.RetriableException;
import ca.bc.gov.nrs.hrs.exception.TooManyRequestsException;
import ca.bc.gov.nrs.hrs.exception.UnretriableException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
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
 * This class contains methods to integrate SILVA REST API with ForestClient API.
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
   * @param number the client number to search for
   * @return the ForestClient with client number, if one exists
   */
  @Retry(name = "apiRetry", fallbackMethod = "fetchClientByNumberFallBack")
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
   * @param page  Pagination parameter
   * @param size  Pagination parameter
   * @param value the value to search for
   * @return List of ForestClientDto
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "paginatedFallback")
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
   * @param clientNumber the client number to search for
   * @return the list of ForestClientLocationDto for the client
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "paginatedFallback")
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

  private Optional<ForestClientDto> fetchClientByNumberFallBack(String number, Throwable ex) {
    log.warn("Fallback for fetchClientByNumber for {} due to {}.", PROVIDER, ex.toString());
    return Optional.empty();
  }

  private <T> Page<T> paginatedFallback(
      int page,
      int size,
      String value,
      Throwable ex
  ) {
    log.warn("Fallback for searchClients for {} due to {}.", PROVIDER, ex.toString());
    return new PageImpl<>(List.of(), PageRequest.of(page, size), 0);
  }

  private <T> Page<T> paginatedFallback(
      String value,
      Throwable ex
  ) {
    return paginatedFallback(0,10, value, ex);
  }
}
