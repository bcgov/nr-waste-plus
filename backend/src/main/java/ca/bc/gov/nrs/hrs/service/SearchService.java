package ca.bc.gov.nrs.hrs.service;

import static java.util.stream.Collectors.toMap;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.provider.LegacyApiProvider;
import io.micrometer.observation.annotation.Observed;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class SearchService {

  private final LegacyApiProvider legacyApiProvider;
  private final ForestClientService forestClientService;

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
}
