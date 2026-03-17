package ca.bc.gov.nrs.hrs.provider.forestclient;

import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.exception.RetriableException;
import ca.bc.gov.nrs.hrs.exception.TooManyRequestsException;
import ca.bc.gov.nrs.hrs.exception.UnretriableException;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Client responsible for fetching individual ForestClient records by number.
 */
@Slf4j
@Component
@Observed
public class ForestClientFetchClient {

  private static final String PROVIDER = "ForestClient API";

  private final RestClient restClient;

  ForestClientFetchClient(@Qualifier("forestClientApi") RestClient forestClientApi) {
    this.restClient = forestClientApi;
  }

  /**
   * Fetch a ForestClient by its number.
   *
   * <p>Handles downstream response status codes mapping them to appropriate
   * domain exceptions (404 -> {@link ForestClientNotFoundException}, 429 ->
   * {@link TooManyRequestsException}, 4xx -> {@link UnretriableException}, 5xx ->
   * {@link RetriableException}).
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

  @SuppressWarnings("unused")
  private Optional<ForestClientDto> fetchClientByNumberFallBack(String number, Throwable ex) {
    log.warn("Fallback for fetchClientByNumber for {} due to {}.",
        PROVIDER,
        ex == null ? "unknown" : ex.toString()
    );
    return Optional.empty();
  }
}

