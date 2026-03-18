package ca.bc.gov.nrs.hrs.provider.legacy;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * Client responsible for legacy reporting-unit search endpoints.
 * 
 * <p>This component handles all communication with legacy API reporting unit search endpoints,
 * including paginated searches, expanded search details, and user lookups. It implements resilience
 * patterns via circuit breaker to gracefully handle failures.
 * </p>
 * 
 * <p>All search operations are protected by circuit breakers with fallback methods that return
 * empty or default results, ensuring the application continues functioning even when the
 * legacy API is unavailable.
 * </p>
 *
 */
@Slf4j
@Component
@Observed
public class LegacyReportingUnitClient {

  static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private static final String PROVIDER = "Legacy API";

  private final RestClient restClient;
  private final LegacyPagedResponseMapper pageMapper;

  /**
   * Constructs a new LegacyReportingUnitClient.
   *
   * @param legacyApi the qualified RestClient bean for the legacy API, must not be null
   * @param pageMapper the mapper for converting paged JSON responses to typed lists,
   *                   must not be null
   */
  LegacyReportingUnitClient(
      @Qualifier("legacyApi") RestClient legacyApi,
      LegacyPagedResponseMapper pageMapper
  ) {
    this.restClient = legacyApi;
    this.pageMapper = pageMapper;
  }

  /**
   * Search reporting units in the legacy API using provided filters and pageable information.
   *
   * <p>This method executes a paginated search against the legacy API endpoint
   * {@code GET /api/search/reporting-units} with the provided filter parameters and
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
   * {@link #fallbackEmptySearchReportingUnit(ReportingUnitSearchParametersDto, Pageable,
   * Throwable)} if the API call fails.
   * </p>
   *
   * @param filters the search filter parameters to apply; may include various reporting
   *                unit criteria
   * @param pageable the pagination information (page number, size, sort order)
   * @return a {@link Page} of {@link ReportingUnitSearchResultDto} containing search results;
   *         never null, may be empty if no results found or API fails
   * @throws org.springframework.web.client.RestClientException if there's an unrecoverable
   *                                                           HTTP error
   *
   * @see ReportingUnitSearchParametersDto
   * @see Pageable
   * @see LegacyPagedResponseMapper
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackEmptySearchReportingUnit")
  @NewSpan
  public Page<ReportingUnitSearchResultDto> searchReportingUnit(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable
  ) {
    JsonNode pagedResponse = restClient
        .get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/search/reporting-units")
            .queryParams(filters.toMultiMap(pageable))
            .build(Map.of())
        )
        .retrieve()
        .body(JsonNode.class);

    if (pageMapper.isInvalidPage(pagedResponse)) {
      logFallbackError(null);
      return new PageImpl<>(LegacyApiConstants.RU_SEARCH_LIST, pageable, 0);
    }

    List<ReportingUnitSearchResultDto> results = pageMapper.readContent(
        pagedResponse,
        ReportingUnitSearchResultDto.class
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
   * Retrieve expanded search details for a specific reporting unit and waste assessment area.
   *
   * <p>This method retrieves detailed information about a specific reporting unit in the context
   * of a waste assessment area. The query is made to the legacy API endpoint:
   * {@code GET /api/search/reporting-units/ex/{reportingUnitId}/{wasteAssessmentAreaId}}
   * </p>
   *
   * <p>The returned object contains comprehensive details including assessment area information,
   * coordinates, status, and associated lists. This method is protected by a circuit breaker
   * that will invoke {@link #fallbackSearchExpand(Long, Long, Throwable)} if the API fails.
   * </p>
   *
   * @param ruId the reporting unit ID; must not be null
   * @param wasteAssessmentAreaId the waste assessment area ID; must not be null
   * @return a {@link ReportingUnitSearchExpandedDto} containing expanded search details;
   *         never null, returns a default empty object if API fails
   * @throws org.springframework.web.client.RestClientException if there's an unrecoverable
   *                                                           HTTP error
   *
   * @see ReportingUnitSearchExpandedDto
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackSearchExpand")
  @NewSpan
  public ReportingUnitSearchExpandedDto getSearchExpanded(Long ruId, Long wasteAssessmentAreaId) {
    return restClient
        .get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/search/reporting-units/ex/{reportingUnitId}/{wasteAssessmentAreaId}")
            .build(Map.of(
                    "reportingUnitId", ruId,
                    "wasteAssessmentAreaId", wasteAssessmentAreaId
                )
            )
        )
        .retrieve()
        .body(ReportingUnitSearchExpandedDto.class);
  }

  /**
   * Search for reporting unit users that match a partial user ID.
   *
   * <p>This method queries the legacy API endpoint
   * {@code GET /api/search/reporting-units-users} to find users whose ID matches or contains
   * the provided search term. The response is a list of user IDs as strings.
   * </p>
   *
   * <p>This method is protected by a circuit breaker that will invoke
   * {@link #fallbackEmptyUsersList(String, Throwable)} if the API call fails.
   * </p>
   *
   * @param userId the search term for user ID matching; used for partial matching
   * @return a list of user IDs as strings that match the search criteria;
   *         never null, returns empty list if no matches found or API fails
   * @throws org.springframework.web.client.RestClientException if there's an unrecoverable
   *                                                           HTTP error
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackEmptyUsersList")
  @NewSpan
  public List<String> searchReportingUnitUsers(String userId) {
    log.info("Searching {} request to /api/search/reporting-units-users for user that matches {}",
        PROVIDER, userId);
    return restClient
        .get()
        .uri(uriBuilder ->
            uriBuilder
                .path("/api/search/reporting-units-users")
                .queryParam("userId", userId)
                .build(Map.of())
        )
        .retrieve()
        .body(new ParameterizedTypeReference<>() {
        });
  }

  /**
   * Fallback method invoked when expanded search retrieval fails.
   *
   * <p>Returns a default empty {@link ReportingUnitSearchExpandedDto} to ensure
   * graceful degradation when the legacy API is unavailable.
   * The returned object has default values with no associated lists or detailed information.
   * </p>
   *
   * @param ruId the reporting unit ID for which expanded details were requested
   * @param wasteAssessmentAreaId the waste assessment area ID
   * @param throwable the exception that triggered the fallback
   * @return a default {@link ReportingUnitSearchExpandedDto} with minimal information
   */
  private ReportingUnitSearchExpandedDto fallbackSearchExpand(Long ruId, Long wasteAssessmentAreaId,
      Throwable throwable) {
    logFallbackError(throwable);
    log.error("Returning empty expanded search result for RU: {}, Waste Assessment Area: {}", ruId,
        wasteAssessmentAreaId);
    return new ReportingUnitSearchExpandedDto(
        wasteAssessmentAreaId,
        null,
        null,
        null,
        false,
        false,
        null,
        List.of(),
        0.0,
        0.0,
        null,
        null,
        null,
        0L,
        0L
    );
  }

  /**
   * Fallback method invoked when user search fails.
   *
   * <p>Returns an empty list to allow the application to continue
   * when the legacy API is unavailable.
   * </p>
   *
   * @param userId the user ID search term that was requested
   * @param throwable the exception that triggered the fallback
   * @return an empty list of user IDs
   */
  @SuppressWarnings("unused")
  private List<String> fallbackEmptyUsersList(String userId, Throwable throwable) {
    logFallbackError(throwable);
    return LegacyApiConstants.EMPTY_STRING_LIST;
  }

  /**
   * Fallback method invoked when reporting unit search fails.
   *
   * <p>Returns an empty page to allow the application to continue
   * when the legacy API is unavailable.
   * </p>
   *
   * @param filters the search filters that were applied
   * @param pageable the pagination settings that were requested
   * @param throwable the exception that triggered the fallback
   * @return an empty page of reporting unit search results
   */
  @SuppressWarnings("unused")
  private Page<ReportingUnitSearchResultDto> fallbackEmptySearchReportingUnit(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      Throwable throwable
  ) {
    logFallbackError(throwable);
    return new PageImpl<>(LegacyApiConstants.RU_SEARCH_LIST, pageable, 0);
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


