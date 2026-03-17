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
 */
@Slf4j
@Component
@Observed
public class LegacyReportingUnitClient {

  static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private static final String PROVIDER = "Legacy API";

  private final RestClient restClient;
  private final LegacyPagedResponseMapper pageMapper;

  LegacyReportingUnitClient(
      @Qualifier("legacyApi") RestClient legacyApi,
      LegacyPagedResponseMapper pageMapper
  ) {
    this.restClient = legacyApi;
    this.pageMapper = pageMapper;
  }

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

  private void logFallbackError(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable == null ? "unknown" : throwable.getMessage());
  }
}


