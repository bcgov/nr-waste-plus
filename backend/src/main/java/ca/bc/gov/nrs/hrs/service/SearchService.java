package ca.bc.gov.nrs.hrs.service;

import static java.util.stream.Collectors.toMap;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.provider.LegacyApiProvider;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Service responsible for searching reporting units and client-related data.
 *
 * <p>This service delegates to {@link LegacyApiProvider} for legacy reporting unit
 * queries and enriches results with client and location details obtained via
 * {@link ForestClientService}.
 * </p>
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class SearchService {

  private final LegacyApiProvider legacyApiProvider;
  private final ForestClientService forestClientService;

  /**
   * Search reporting units using the supplied filters and pageable settings.
   *
   * <p>Results are enriched with client names and client location details by
   * calling the Forest Client service.
   * </p>
   *
   * @param filters search filters
   * @param pageable paging parameters
   * @return a page of {@link ReportingUnitSearchResultDto} enriched with client info
   */
  @NewSpan
  public Page<ReportingUnitSearchResultDto> search(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable
  ) {

    //Search the legacy API for reporting units
    var result = legacyApiProvider.searchReportingUnit(filters, pageable);

    //Build a map of clients and load details from Forest Client Service
    var clients =
        result
            .stream()
            .map(ReportingUnitSearchResultDto::client)
            .distinct()
            .map(client ->
                forestClientService
                    .getClientByNumber(client.code())
                    .map(forestClientDto -> client.withDescription(forestClientDto.name()))
                    .orElse(client)
            )
            .collect(toMap(CodeDescriptionDto::code, client -> client));

    //Build a map of client locations and load details from Forest Client Service
    var locations =
        clients
            .keySet()
            .stream()
            .map(client -> Pair.of(client, forestClientService.getClientLocations(client)))
            .flatMap(entry ->
                entry
                    .getRight()
                    .stream()
                    .map(location ->
                        Pair.of(String.format("%s-%s", entry.getLeft(), location.code()), location)
                    )
            )
            .collect(toMap(Pair::getLeft, Pair::getRight));

    //Enrich the results with client and location details
    return result
        .map(entry -> entry.withId(
                String.format(
                    "RU-%d-Block-%s",
                    entry.ruNumber(),
                    Objects.toString(entry.blockId(), "N/A"))
            )
        )
        .map(entry -> entry.withClient(clients.get(entry.client().code())))
        .map(entry -> entry
            .withClientLocation(
                locations.get(
                    String.format("%s-%s", entry.client().code(), entry.clientLocation().code())
                )
            )
        );
  }

  /**
   * Search reporting units associated with a user.
   *
   * @param userId the user id to query
   * @return list of reporting unit ids as strings
   */
  @NewSpan
  public List<String> searchReportingUnitUser(String userId) {
    return legacyApiProvider.searchReportingUnitUsers(userId);
  }

  /**
   * Search clients for a user's My Forest view.
   *
   * <p>When a textual value is provided the method filters clients accordingly and
   * may return an empty page if none match.
   * </p>
   *
   * @param pageable paging parameters
   * @param value optional filter value
   * @param allClients list of clients to consider
   * @return a page of {@link MyForestClientSearchResultDto} enriched with client info
   */
  @NewSpan
  public Page<MyForestClientSearchResultDto> searchByMyForestClient(
      Pageable pageable,
      String value,
      List<String> allClients
  ) {
    log.info("Loading my clients with filter: {}, pageable: {}, possible values: {}", value, pageable, allClients);
    // #127 if we have a value to filter by, we need to load only those clients
    Map<String, CodeDescriptionDto> response = StringUtils.isNotBlank(value)
        ? mapClients(allClients, value)
        : new HashMap<>();

    if (StringUtils.isNotBlank(value)) {
      log.info("Filtering search by clients: {}", response.keySet());

      if (response.isEmpty()) {
        return new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
      }
    }

    Page<MyForestClientSearchResultDto> page = legacyApiProvider.searchMyClients(
        response.keySet(),
        pageable
    );

    List<String> clients = page
        .stream()
        .map(entry -> entry.client().code())
        .toList();

    // #127 if we don't have a value to filter by, we need to load all clients in the page
    if (StringUtils.isBlank(value)) {
      response.putAll(mapClients(clients, null));
    }

    return page
        .map(entry -> entry.withClient(
                response.getOrDefault(entry.client().code(), entry.client())
            )
        );
  }

  private Map<String, CodeDescriptionDto> mapClients(List<String> clients, String value) {
    System.out.println("Mapping clients: " + clients + " with filter: " + value);
    return forestClientService.searchByClientNumbers(
            0,
            clients.size(),
            clients,
            value
        )
        .stream()
        .peek(System.out::println)
        .map(entry -> new CodeDescriptionDto(entry.clientNumber(), entry.name()))
        .collect(Collectors.toMap(CodeDescriptionDto::code, client -> client));
  }
}
