package ca.bc.gov.nrs.hrs.service.search;

import static ca.bc.gov.nrs.hrs.service.search.ServiceConstants.SORT_DISTRICT_FIELDS;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.search.ClientDistrictSearchResultDto;
import ca.bc.gov.nrs.hrs.mappers.search.ClientDistrictSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.PaginationUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Service for advanced search operations on reporting units and client districts.
 *
 * <p>This service provides functionality to search for reporting unit users and retrieve
 * aggregated client district information for authenticated users. It handles client-scoping
 * and pagination for search results, delegating database queries to the repository layer
 * and mapping projection results to DTOs.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class AdvancedSearchService {

  private final ReportingUnitRepository ruRepository;
  private final ClientDistrictSearchMapper clientDistrictSearchMapper;


  /**
   * Search reporting-unit users matching the supplied userId fragment.
   *
   * <p>This method performs an approximate match (repository-side) and scopes the search
   * by the provided client list; when the caller has no clients the repository is passed a sentinel
   * value to avoid an unrestricted search.</p>
   *
   * @param userId          the user identifier fragment to find (case-insensitive)
   * @param clientFromRoles list of client numbers derived from the caller's roles
   * @return a list of matching user identifiers
   */
  public List<String> searchReportingUnitUsers(String userId, List<String> clientFromRoles) {
    log.info("Searching users that matches {} within reporting units that belongs to clients {}",
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
   * @param clients optional list of clients to include; when empty, caller's clients should be
   *                used
   * @param page    paging and sorting information
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
