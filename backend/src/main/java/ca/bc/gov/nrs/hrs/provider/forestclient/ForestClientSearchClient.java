package ca.bc.gov.nrs.hrs.provider.forestclient;

import ca.bc.gov.nrs.hrs.BackendConstants;
import ca.bc.gov.nrs.hrs.dto.client.ForestClientDto;
import ca.bc.gov.nrs.hrs.util.UriUtils;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
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
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Client responsible for ForestClient search endpoints.
 */
@Slf4j
@Component
@Observed
public class ForestClientSearchClient {

  private static final String PROVIDER = "ForestClient API";

  private final RestClient restClient;

  ForestClientSearchClient(@Qualifier("forestClientApi") RestClient forestClientApi) {
    this.restClient = forestClientApi;
  }

  /**
   * Search client by name, acronym or number.
   *
   * <p>Returns a pageable result of {@link ForestClientDto}. The total count is
   * read from the {@code X-Total-Count} response header.
   * </p>
   *
   * @param page  pagination page
   * @param size  pagination size
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

  /**
   * Search clients by a list of IDs with optional name filter.
   *
   * @param page   Page number
   * @param size   Number of items per page
   * @param values List of client IDs to search
   * @param name   Optional name filter
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
  }

  @SuppressWarnings("unused")
  private <T> Page<T> paginatedFallback(
      int page,
      int size,
      String value,
      Throwable ex
  ) {
    log.warn("Fallback for searchClients for {} due to {}.",
        PROVIDER,
        ex == null ? "unknown" : ex.toString()
    );
    List<T> empty = Collections.emptyList();
    return new PageImpl<>(empty, PageRequest.of(page, size), 0);
  }

  @SuppressWarnings("unused")
  private List<ForestClientDto> searchClientsByIdsFallback(
      int page,
      int size,
      List<String> values,
      String name,
      Throwable ex
  ) {
    log.warn("Fallback for searchClientsByIds for {} due to {}.",
        PROVIDER,
        ex == null ? "unknown" : ex.toString()
    );
    return ForestClientConstants.EMPTY_FOREST_CLIENT_LIST;
  }
}

