package ca.bc.gov.nrs.hrs.service.search;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchExpandedMapper;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.util.PaginationUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.BooleanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Service that provides search capabilities for reporting units and related aggregates.
 *
 * <p>This service exposes methods used by controller endpoints to perform paged searches of
 * reporting units, search for matching reporting-unit users, and to aggregate client/district level
 * statistics ("my forest clients"). Queries are executed via {@link ReportingUnitRepository} and
 * results are mapped to DTOs using MapStruct mappers.</p>
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
  private final ReportingUnitSearchExpandedMapper expandedMapper;

  /**
   * Search reporting units using the provided filters and pageable settings.
   *
   * <p>The method scopes results by client numbers derived from the caller's roles unless a
   * specific client number filter is supplied (see #128 behavior). Sorting is resolved via
   * {@link PaginationUtil#resolveSort(org.springframework.data.domain.Sort, String, Map)}. The
   * repository returns projection objects which are then mapped to
   * {@link ReportingUnitSearchResultDto} instances.</p>
   *
   * @param filters           search filter DTO containing various optional criteria
   * @param page              paging and sorting information
   * @param userClientNumbers client numbers derived from the caller's roles for scoping
   * @param currentUserId     current user id, used when requestByMe is selected
   * @return a page of {@link ReportingUnitSearchResultDto} matching the supplied criteria
   */
  @NewSpan
  public Page<ReportingUnitSearchResultDto> search(
      ReportingUnitSearchParametersDto filters,
      Pageable page,
      List<String> userClientNumbers,
      String currentUserId
  ) {

    // If no client numbers are provided in the filters, or if the only value is the
    // #128: limit query by client numbers provided by the roles
    if (CollectionUtils.isEmpty(filters.getClientNumbers())
        || (
            filters.getClientNumbers().size() == 1
            && LegacyConstants.NOVALUE.equalsIgnoreCase(filters.getClientNumbers().get(0))
        )
    ) {
      filters.setClientNumbers(userClientNumbers);
    }

    if(filters.isRequestByMe()) {
      filters.setRequestUserId(currentUserId);
    }

    log.info("Searching reporting units with filters: {}, pageable: {}", filters, page);

    return ruRepository
        .searchReportingUnits(
            filters,
            PageRequest.of(
                page.getPageNumber(),
                page.getPageSize(),
                PaginationUtil.resolveSort(page.getSort(), "ru_number",
                    ServiceConstants.SORT_FIELDS)
            )
        )
        .map(ruSearchMapper::fromProjection);
  }

  /**
   * Retrieve an expanded view of a reporting unit block with all associated search data.
   *
   * <p>This method fetches detailed information for a specific block within a reporting unit,
   * including all related expanded data necessary for the search detail view. The repository
   * returns a projection object which is then mapped to a
   * {@link ReportingUnitSearchExpandedDto} instance.</p>
   *
   * @param reportingUnit the ID of the reporting unit
   * @param blockId       the ID of the block to retrieve
   * @return an Optional containing the {@link ReportingUnitSearchExpandedDto} if found,
   *         or empty if the reporting unit or block does not exist
   */
  public Optional<ReportingUnitSearchExpandedDto> getReportingUnitBlockExpanded(
      Long reportingUnit,
      Long blockId
  ) {

    log.info("Fetching expanded reporting unit block for RU: {}, Block: {}", reportingUnit,
        blockId);

    return ruRepository
        .getSearchExpandedContent(
            reportingUnit,
            blockId
        )
        .map(expandedMapper::fromProjection);
  }

}
