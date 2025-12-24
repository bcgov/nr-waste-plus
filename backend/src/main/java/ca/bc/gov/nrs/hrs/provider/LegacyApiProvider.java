package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.util.UriUtils;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Provider that forwards requests to the legacy backend API and adapts responses for use in the
 * newer HRS backend.
 *
 * <p>This component centralizes calls to the legacy API for code lists and search endpoints. It
 * applies resilience patterns (circuit breaker) and contains fallback implementations when the
 * legacy system is unavailable. Static fallback data has been centralized in
 * {@link LegacyApiConstants}.
 * </p>
 */
@Slf4j
@Component
@Observed
public class LegacyApiProvider {

  public static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private final RestClient restClient;
  private final JsonMapper mapper;

  private static final String PROVIDER = "Legacy API";

  LegacyApiProvider(
      @Qualifier("legacyApi") RestClient legacyApi,
      JsonMapper mapper
  ) {
    this.restClient = legacyApi;
    this.mapper = mapper;
  }

  /**
   * Retrieve district code list from the legacy API.
   *
   * <p>Returns a list of {@link CodeDescriptionDto} representing district codes.</p>
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
   * Retrieve sampling codes from the legacy API.
   *
   * <p>Returns a list of {@link CodeDescriptionDto} representing sampling codes.</p>
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
   * Retrieve status codes from the legacy API.
   *
   * <p>Returns a list of {@link CodeDescriptionDto} representing assess area statuses.</p>
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
   * Search reporting units in the legacy API using provided filters and pageable information.
   *
   * <p>The legacy API responds with a paged JSON structure; this method retrieves the raw
   * {@link JsonNode} and converts its content portion into a {@link Page} of
   * {@link ReportingUnitSearchResultDto}.
   * </p>
   *
   * @param filters  search filters to apply
   * @param pageable pageable information to include in the request
   * @return a {@link Page} of {@link ReportingUnitSearchResultDto}
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackEmptySearchReportingUnit")
  @NewSpan
  public Page<ReportingUnitSearchResultDto> searchReportingUnit(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable
  ) {
    // Response is retrieved as JsonNode because the legacy sends back a page
    // and a page cannot be deserialized
    JsonNode pagedResponse = restClient
        .get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/search/reporting-units")
            .queryParams(filters.toMultiMap(pageable))
            .build(Map.of())
        )
        .retrieve()
        .body(JsonNode.class);
    if (pagedResponse == null
        || pagedResponse.get(LegacyApiConstants.CONTENT_CONST) == null
        || pagedResponse.get(LegacyApiConstants.PAGE_CONST) == null
    ) {
      logFallbackError(null);
      return new PageImpl<>(LegacyApiConstants.RU_SEARCH_LIST, pageable, 0);
    }

    List<ReportingUnitSearchResultDto> results = mapper.convertValue(
        pagedResponse.get(LegacyApiConstants.CONTENT_CONST),
        mapper.getTypeFactory()
            .constructCollectionType(List.class, ReportingUnitSearchResultDto.class)
    );

    long totalElements = 0L;
    try {
      totalElements = pagedResponse
          .get(LegacyApiConstants.PAGE_CONST)
          .get("totalElements")
          .asLong();
    } catch (Exception e) {
      logFallbackError(e);
    }

    return new PageImpl<>(
        results,
        pageable,
        totalElements
    );
  }

  /**
   * Retrieve expanded search details for a specific reporting unit and block from the legacy API.
   *
   * @param ruId    the reporting unit ID
   * @param blockId the block ID
   * @return a {@link ReportingUnitSearchExpandedDto} with expanded details
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackSearchExpand")
  @NewSpan
  public ReportingUnitSearchExpandedDto getSearchExpanded(Long ruId, Long blockId) {
    return restClient
        .get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/search/reporting-units/ex/{reportingUnitId}/{blockId}")
            .build(Map.of(
                    "reportingUnitId", ruId,
                    "blockId", blockId
                )
            )
        )
        .retrieve()
        .body(ReportingUnitSearchExpandedDto.class);
  }

  /**
   * Search for reporting unit users that match a partial user id.
   *
   * <p>Returns a list of user ids as strings.</p>
   *
   * @param userId the search term for user id
   * @return a list of matching user ids
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
   * Search "My Forest" clients in the legacy API.
   *
   * <p>The legacy API returns a paged JSON structure; this method converts the content field into a
   * {@link Page} of {@link MyForestClientSearchResultDto}.
   * </p>
   *
   * @param values   the set of client values to search for
   * @param pageable pageable information to include in the request
   * @return a {@link Page} of {@link MyForestClientSearchResultDto}
   */
  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackSearchMyClients")
  @NewSpan
  public Page<MyForestClientSearchResultDto> searchMyClients(
      Set<String> values,
      Pageable pageable
  ) {
    log.info("Searching {} request to /api/search/my-forest-clients for values that match {}",
        PROVIDER, values);

    // Response is retrieved as JsonNode because the legacy sends back a page
    // and a page cannot be deserialized
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

    if (pagedResponse == null
        || pagedResponse.get(LegacyApiConstants.CONTENT_CONST) == null
        || pagedResponse.get(LegacyApiConstants.PAGE_CONST) == null
    ) {
      logFallbackError(null);
      return new PageImpl<>(LegacyApiConstants.MY_CLIENTS_LIST, pageable, 0);
    }

    List<MyForestClientSearchResultDto> results = mapper.convertValue(
        pagedResponse.get(LegacyApiConstants.CONTENT_CONST),
        mapper.getTypeFactory()
            .constructCollectionType(List.class, MyForestClientSearchResultDto.class)
    );

    long totalElements = 0L;
    try {
      totalElements = pagedResponse
          .get(LegacyApiConstants.PAGE_CONST)
          .get("totalElements")
          .asLong(0L);
    } catch (Exception e) {
      logFallbackError(e);
    }

    return new PageImpl<>(
        results,
        pageable,
        totalElements
    );
  }

  private ReportingUnitSearchExpandedDto fallbackSearchExpand(Long ruId, Long blockId,
      Throwable throwable) {
    logFallbackError(throwable);
    log.error("Returning empty expanded search result for RU: {}, Block: {}", ruId, blockId);
    return new ReportingUnitSearchExpandedDto(
        blockId,
        null,
        null,
        null,
        false,
        false,
        0.0,
        null,
        null,
        null,
        0
    );
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

  @SuppressWarnings("unused")
  private List<String> fallbackEmptyUsersList(String userId, Throwable throwable) {
    logFallbackError(throwable);
    return LegacyApiConstants.EMPTY_STRING_LIST;
  }

  @SuppressWarnings("unused")
  private Page<ReportingUnitSearchResultDto> fallbackEmptySearchReportingUnit(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      Throwable throwable
  ) {
    logFallbackError(throwable);
    return new PageImpl<>(LegacyApiConstants.RU_SEARCH_LIST, pageable, 0);
  }

  @SuppressWarnings("unused")
  private Page<MyForestClientSearchResultDto> fallbackSearchMyClients(
      Set<String> values,
      Pageable pageable,
      Throwable throwable
  ) {
    logFallbackError(throwable);
    return new PageImpl<>(LegacyApiConstants.MY_CLIENTS_LIST, pageable, 0);
  }

  // Central helper to log fallback errors which avoids repeated log.error calls
  private void logFallbackError(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable == null ? "unknown" : throwable.getMessage());
  }

}
