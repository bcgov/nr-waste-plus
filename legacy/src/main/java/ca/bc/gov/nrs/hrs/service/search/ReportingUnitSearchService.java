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
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Service that provides search capabilities for reporting units and related aggregates.
 *
 * <p>This service exposes methods used by controller endpoints to perform paged searches of
 * reporting units, search for matching reporting-unit users, and to aggregate client/district
 * level statistics ("my forest clients"). Queries are executed via {@link ReportingUnitRepository}
 * and results are mapped to DTOs using MapStruct mappers.</p>
 *
 * <p>Sorting is resolved using {@link PaginationUtil} which maps client-visible property names
 * to database columns; sort mappings are defined in {@code SORT_FIELDS} and
 * {@code SORT_DISTRICT_FIELDS}.</p>
 */
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

  /**
   * Search reporting units using the provided filters and pageable settings.
   *
   * <p>The method scopes results by client numbers derived from the caller's roles unless a
   * specific client number filter is supplied (see #128 behavior). Sorting is resolved via
   * {@link PaginationUtil#resolveSort(org.springframework.data.domain.Sort, String, Map)}.
   * The repository returns projection objects which are then mapped to
   * {@link ReportingUnitSearchResultDto} instances.</p>
   *
   * @param filters search filter DTO containing various optional criteria
   * @param page paging and sorting information
   * @param userClientNumbers client numbers derived from the caller's roles for scoping
   * @return a page of {@link ReportingUnitSearchResultDto} matching the supplied criteria
   */
  @NewSpan
  public Page<ReportingUnitSearchResultDto> search(
      ReportingUnitSearchParametersDto filters,
      Pageable page,
      List<String> userClientNumbers
  ) {

    // #128: limit query by client numbers provided by the roles
    if (CollectionUtils.isEmpty(filters.getClientNumbers())) {
      filters.setClientNumbers(userClientNumbers);
    }

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

  /**
   * Search reporting-unit users matching the supplied userId fragment.
   *
   * <p>This method performs an approximate match (repository-side) and scopes the search
   * by the provided client list; when the caller has no clients the repository is passed
   * a sentinel value to avoid an unrestricted search.</p>
   *
   * @param userId the user identifier fragment to find (case-insensitive)
   * @param clientFromRoles list of client numbers derived from the caller's roles
   * @return a list of matching user identifiers
   */
  public List<String> searchReportingUnitUsers(String userId, List<String> clientFromRoles) {
    log.info("Searching users that matches {} withing reporting units that belongs to clients {}",
        userId, clientFromRoles);

    List<String> clients = clientFromRoles != null && !clientFromRoles.isEmpty() ? clientFromRoles
        : List.of(LegacyConstants.NOVALUE);

    return ruRepository
        .searchReportingUnitUsers(
            userId.toUpperCase(Locale.ROOT),
            clients
        );
  }

  /**
   * Search client districts aggregated for the authenticated user's forest ("my forest clients").
   *
   * <p>The method executes an aggregation query via the repository which computes submission and
   * block counts per client and returns a paged projection mapped to
   * {@link ClientDistrictSearchResultDto}.</p>
   *
   * @param clients optional list of clients to include; when empty, caller's clients should be used
   * @param page paging and sorting information
   * @return a page of {@link ClientDistrictSearchResultDto} representing aggregated client stats
   */
  public Page<ClientDistrictSearchResultDto> searchMyClients(
      List<String> clients, Pageable page
  ) {
    log.info("Loading my clients with filters: {}, pageable: {}", clients, page);
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
