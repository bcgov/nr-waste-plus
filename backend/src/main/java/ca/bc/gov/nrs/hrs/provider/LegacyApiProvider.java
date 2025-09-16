package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.util.UriUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

@Slf4j
@Component
@Observed
public class LegacyApiProvider {

  public static final String FALLBACK_ERROR = "Error occurred while fetching data from {}: {}";
  private final RestClient restClient;
  private final ObjectMapper mapper;

  private static final String PROVIDER = "Legacy API";

  LegacyApiProvider(
      @Qualifier("legacyApi") RestClient legacyApi,
      ObjectMapper mapper
  ) {
    this.restClient = legacyApi;
    this.mapper = mapper;
  }

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

    List<ReportingUnitSearchResultDto> results = mapper.convertValue(
        pagedResponse.get("content"),
        mapper.getTypeFactory()
            .constructCollectionType(List.class, ReportingUnitSearchResultDto.class)
    );

    return new PageImpl<>(
        results,
        pageable,
        pagedResponse.get("page").get("totalElements").asLong()
    );
  }

  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackEmptyUsersList")
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

    List<MyForestClientSearchResultDto> results = mapper.convertValue(
        pagedResponse.get("content"),
        mapper.getTypeFactory()
            .constructCollectionType(List.class, MyForestClientSearchResultDto.class)
    );

    return new PageImpl<>(
        results,
        pageable,
        pagedResponse.get("page").get("totalElements").asLong()
    );
  }

  private List<CodeDescriptionDto> fallbackDistricts(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable.getMessage());
    return List.of(
        new CodeDescriptionDto("DCC", "Cariboo-Chilcotin"),
        new CodeDescriptionDto("DMH", "100 Mile House"),
        new CodeDescriptionDto("DCK", "Chilliwack"),
        new CodeDescriptionDto("DFN", "Fort Nelson"),
        new CodeDescriptionDto("DQC", "Haida Gwaii"),
        new CodeDescriptionDto("DMK", "Mackenzie"),
        new CodeDescriptionDto("DND", "Nadina"),
        new CodeDescriptionDto("DNI", "North Island - Central Coast"),
        new CodeDescriptionDto("DPC", "Peace"),
        new CodeDescriptionDto("DPG", "Prince George"),
        new CodeDescriptionDto("DQU", "Quesnel"),
        new CodeDescriptionDto("DRM", "Rocky Mountain"),
        new CodeDescriptionDto("DSQ", "Sea to Sky"),
        new CodeDescriptionDto("DSE", "Selkirk"),
        new CodeDescriptionDto("DSS", "Skeena Stikine"),
        new CodeDescriptionDto("DSI", "South Island"),
        new CodeDescriptionDto("DVA", "Stuart Nechako"),
        new CodeDescriptionDto("DSC", "Sunshine Coast"),
        new CodeDescriptionDto("DKA", "Thompson Rivers"),
        new CodeDescriptionDto("DKM", "Coast Mountains"),
        new CodeDescriptionDto("DOS", "Okanagan Shuswap"),
        new CodeDescriptionDto("DCS", "Cascades"),
        new CodeDescriptionDto("DCR", "Campbell River")
    );
  }

  private List<CodeDescriptionDto> fallbackEmptyList(Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable.getMessage());
    return List.of();
  }

  private List<String> fallbackEmptyUsersList(String userId, Throwable throwable) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable.getMessage());
    return List.of();
  }

  private Page<ReportingUnitSearchResultDto> fallbackEmptySearchReportingUnit(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      Throwable throwable
  ) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable.getMessage());
    return new PageImpl<>(List.of(), pageable, 0);
  }

  private Page<MyForestClientSearchResultDto> fallbackSearchMyClients(
      Set<String> values,
      Pageable pageable,
      Throwable throwable
  ) {
    log.error(FALLBACK_ERROR, PROVIDER, throwable.getMessage());
    return new PageImpl<>(List.of(), pageable, 0);
  }

}
