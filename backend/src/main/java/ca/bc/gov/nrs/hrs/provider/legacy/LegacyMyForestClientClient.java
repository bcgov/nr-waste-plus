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
 */
@Slf4j
@Component
@Observed
public class LegacyMyForestClientClient {

  static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private static final String PROVIDER = "Legacy API";

  private final RestClient restClient;
  private final LegacyPagedResponseMapper pageMapper;

  LegacyMyForestClientClient(
      @Qualifier("legacyApi") RestClient legacyApi,
      LegacyPagedResponseMapper pageMapper
  ) {
    this.restClient = legacyApi;
    this.pageMapper = pageMapper;
  }

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

  @SuppressWarnings("unused")
  private Page<MyForestClientSearchResultDto> fallbackSearchMyClients(
      Set<String> values,
      Pageable pageable,
      Throwable throwable
  ) {
    logFallbackError(throwable);
    return new PageImpl<>(LegacyApiConstants.MY_CLIENTS_LIST, pageable, 0);
  }

  private void logFallbackError(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable == null ? "unknown" : throwable.getMessage());
  }
}


