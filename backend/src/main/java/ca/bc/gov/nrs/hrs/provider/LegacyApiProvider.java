package ca.bc.gov.nrs.hrs.provider;

import ca.bc.gov.nrs.hrs.dto.CodeNameDto;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
@Observed
public class LegacyApiProvider {

  private final RestClient restClient;

  private static final String PROVIDER = "Legacy API";

  LegacyApiProvider(@Qualifier("legacyApi") RestClient legacyApi) {
    this.restClient = legacyApi;
  }

  @CircuitBreaker(name = "breaker", fallbackMethod = "fallbackEmptyList")
  public List<CodeNameDto> getDistrictCodes() {
    log.info("Starting {} request to /codes/districts", PROVIDER);
    return restClient
        .get()
        .uri("/api/codes/districts")
        .retrieve()
        .body(new ParameterizedTypeReference<>() {
        });
  }

  private List<CodeNameDto> fallbackEmptyList(Throwable throwable) {
    log.error("Error occurred while fetching data from {}: {}", PROVIDER, throwable.getMessage());
    return List.of(
        new CodeNameDto("DMH", "100 Mile House Natural Resource District"),
        new CodeNameDto("DCC", "Cariboo-Chilcotin Natural Resource District"),
        new CodeNameDto("DCK", "Chilliwack Natural Resource District"),
        new CodeNameDto("DFN", "Fort Nelson Natural Resource District"),
        new CodeNameDto("DQC", "Haida Gwaii Natural Resource District"),
        new CodeNameDto("DMK", "Mackenzie Natural Resource District"),
        new CodeNameDto("DND", "Nadina Natural Resource District"),
        new CodeNameDto("DNI", "North Island - Central Coast Natural Resource District"),
        new CodeNameDto("DPC", "Peace Natural Resource District"),
        new CodeNameDto("DPG", "Prince George Natural Resource District"),
        new CodeNameDto("DQU", "Quesnel Natural Resource District"),
        new CodeNameDto("DRM", "Rocky Mountain Natural Resource District"),
        new CodeNameDto("DSQ", "Sea to Sky Natural Resource District"),
        new CodeNameDto("DSE", "Selkirk Natural Resource District"),
        new CodeNameDto("DSS", "Skeena Stikine Natural Resource District"),
        new CodeNameDto("DSI", "South Island Natural Resource District"),
        new CodeNameDto("DVA", "Stuart Nechako Natural Resource District"),
        new CodeNameDto("DSC", "Sunshine Coast Natural Resource District"),
        new CodeNameDto("DKA", "Thompson Rivers Natural Resource District"),
        new CodeNameDto("DKM", "Coast Mountains Natural Resource District"),
        new CodeNameDto("DOS", "Okanagan Shuswap Natural Resource District"),
        new CodeNameDto("DCS", "Cascades Natural Resource District"),
        new CodeNameDto("DCR", "Campbell River Natural Resource District")
    );
  }

}
