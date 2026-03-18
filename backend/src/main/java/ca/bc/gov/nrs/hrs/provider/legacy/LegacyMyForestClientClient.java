package ca.bc.gov.nrs.hrs.provider.legacy;

import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.util.UriUtils;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * Client responsible for legacy "my forest clients" search endpoints.
 * 
 * <p>This component handles all communication with the legacy API for searching forest clients
 * associated with a user. It implements resilience patterns via circuit breaker to gracefully
 * handle failures.
 * </p>
 * 
 * <p>Search operations are protected by circuit breakers with fallback methods that return
 * empty pages, ensuring the application continues functioning even when the legacy API
 * is unavailable.
 * </p>
 *
 */
@Slf4j
@Component
@Observed
public class LegacyMyForestClientClient {

  static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private static final String PROVIDER = "Legacy API";

  private final RestClient restClient;
  private final LegacyPagedResponseMapper pageMapper;

  /**
   * Constructs a new LegacyMyForestClientClient.
   * 
   * @param legacyApi the qualified RestClient bean for the legacy API, must not be null
   * @param pageMapper the mapper for converting paged JSON responses to typed lists,
   *                   must not be null
   */
  LegacyMyForestClientClient(
      @Qualifier("legacyApi") RestClient legacyApi,
      LegacyPagedResponseMapper pageMapper
  ) {
    this.restClient = legacyApi;
    this.pageMapper = pageMapper;
  }

  /**
   * Search "My Forest" clients in the legacy API with specified filter values and pagination.
   *
   * <p>This method executes a paginated search against the legacy API endpoint
   * {@code GET /api/search/my-forest-clients} with the provided filter values and
   * pagination settings. The response is expected to be a paged JSON structure with a
   * {@code content} field containing the results and a {@code page} field containing
   * pagination metadata.
   * </p>
   *
   * <p>If the response is invalid or missing required fields, the method returns an empty page.
   * If the total elements cannot be determined from the response metadata, it defaults to 0.
   * </p>
   *
   * <p>This method is protected by a circuit breaker that will invoke
   * {@link #fallbackSearchMyClients(Set, Pageable, Throwable)} if the API call fails.
   * </p>
   *
   * @param values the set of client values to search for; must not be null
   * @param pageable the pagination information (page number, size, sort order)
   * @return a {@link Page} of {@link MyForestClientSearchResultDto} containing search results;
   *         never null, may be empty if no results found or API fails
   * @throws org.springframework.web.client.RestClientException if there's an unrecoverable
   *                                                           HTTP error
   *
   * @see MyForestClientSearchResultDto
   * @see Pageable
   * @see LegacyPagedResponseMapper
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackSearchMyClients")
  @NewSpan
  public Page<MyForestClientSearchResultDto> searchMyClients(
      Set<String> values,
      Pageable pageable
  ) {
    log.info("Searching {} request to /api/search/my-forest-clients for values that match {}",
        PROVIDER, values);

    JsonNode pagedResponse = restClient
        .get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/search/my-forest-clients")
            .queryParam("values", values)
            .queryParams(UriUtils.buildPageableQueryParam(pageable))
            .build(Map.of())
        )
        .retrieve()
        .body(JsonNode.class);

    if (pageMapper.isInvalidPage(pagedResponse)) {
      logFallbackError(null);
      return new PageImpl<>(LegacyApiConstants.MY_CLIENTS_LIST, pageable, 0);
    }

    List<MyForestClientSearchResultDto> results = pageMapper.readContent(
        pagedResponse,
        MyForestClientSearchResultDto.class
    );

    long totalElements = 0L;
    try {
      totalElements = pageMapper.readTotalElements(pagedResponse);
    } catch (Exception e) {
      logFallbackError(e);
    }

    return new PageImpl<>(results, pageable, totalElements);
  }

  /**
   * Fallback method invoked when "my forest clients" search fails.
   *
   * <p>Returns an empty page to allow the application to continue
   * when the legacy API is unavailable.
   * </p>
   *
   * @param values the set of client values that were being searched
   * @param pageable the pagination settings that were requested
   * @param throwable the exception that triggered the fallback
   * @return an empty page of forest client search results
   */
  @SuppressWarnings("unused")
  private Page<MyForestClientSearchResultDto> fallbackSearchMyClients(
      Set<String> values,
      Pageable pageable,
      Throwable throwable
  ) {
    logFallbackError(throwable);
    return new PageImpl<>(LegacyApiConstants.MY_CLIENTS_LIST, pageable, 0);
  }

  /**
   * Logs fallback errors for debugging and monitoring purposes.
   *
   * <p>This method standardizes error logging when circuit breaker fallbacks are triggered,
   * providing consistent error information for troubleshooting.
   * </p>
   *
   * @param throwable the exception that occurred, may be null if reason is unknown
   */
  private void logFallbackError(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable == null ? "unknown" : throwable.getMessage());
  }
}


