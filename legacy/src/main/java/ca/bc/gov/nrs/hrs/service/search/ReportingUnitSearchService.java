package ca.bc.gov.nrs.hrs.service.search;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.search.ClientDistrictSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.mappers.search.ClientDistrictSearchMapper;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.PaginationUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class ReportingUnitSearchService {

  private final ReportingUnitRepository ruRepository;
  private final ReportingUnitSearchMapper ruSearchMapper;
  private final ClientDistrictSearchMapper clientDistrictSearchMapper;
  private static final Map<String, String> SORT_FIELDS =
      Map.ofEntries(
          Map.entry("ruNumber", "ru_number"),
          Map.entry("blockId", "block_id"),
          Map.entry("client", "client_number"),
          Map.entry("clientNumber", "client_number"),
          Map.entry("clientName", "client_number"),
          Map.entry("sampling", "sampling_code"),
          Map.entry("samplingCode", "sampling_code"),
          Map.entry("samplingName", "sampling_code"),
          Map.entry("district", "district_code"),
          Map.entry("districtCode", "district_code"),
          Map.entry("districtName", "district_code"),
          Map.entry("status", "status_code"),
          Map.entry("statusCode", "status_code"),
          Map.entry("statusName", "status_code"),
          Map.entry("lastUpdated", "last_updated")
      );
  private static final Map<String, String> SORT_DISTRICT_FIELDS =
      Map.ofEntries(
          Map.entry("client", "client_number"),
          Map.entry("clientNumber", "client_number"),
          Map.entry("clientName", "client_number"),
          Map.entry("submissionsCount", "submissions_count"),
          Map.entry("blocksCount", "blocks_count"),
          Map.entry("lastUpdate", "last_update")
      );

  @NewSpan
  public Page<ReportingUnitSearchResultDto> search(
      ReportingUnitSearchParametersDto filters,
      Pageable page
  ) {

    log.info("Searching reporting units with filters: {}, pageable: {}", filters, page);

    return ruRepository
        .searchReportingUnits(
            filters,
            PageRequest.of(
                page.getPageNumber(),
                page.getPageSize(),
                PaginationUtil.resolveSort(page.getSort(), "ru_number", SORT_FIELDS)
            )
        )
        .map(ruSearchMapper::fromProjection);
  }

  public List<String> searchReportingUnitUsers(String userId, List<String> clientFromRoles) {
    log.info(
        "Searching possible users that matches {} withing reporting units that belongs to clients {}",
        userId, clientFromRoles);
    List<String> clients = clientFromRoles != null && !clientFromRoles.isEmpty() ? clientFromRoles
        : List.of(LegacyConstants.NOVALUE);
    return ruRepository
        .searchReportingUnitUsers(
            userId.toUpperCase(Locale.ROOT),
            clients
        );
  }

  public Page<ClientDistrictSearchResultDto> searchMyClients(
      List<String> clients, Pageable page
  ) {
    return
        ruRepository
            .searchMyClients(
                clients,
                PageRequest.of(
                    page.getPageNumber(),
                    page.getPageSize(),
                    PaginationUtil.resolveSort(
                        page.getSort(),
                        "last_update",
                        SORT_DISTRICT_FIELDS
                    )
                )
            )
            .map(clientDistrictSearchMapper::fromProjection);
  }
}
