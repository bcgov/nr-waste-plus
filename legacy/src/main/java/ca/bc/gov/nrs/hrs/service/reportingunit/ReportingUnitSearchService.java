package ca.bc.gov.nrs.hrs.service.reportingunit;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchExpandedMapper;
import ca.bc.gov.nrs.hrs.mappers.search.ReportingUnitSearchMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.service.search.ServiceConstants;
import ca.bc.gov.nrs.hrs.util.PaginationUtil;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

/**
 * Service that provides search capabilities for reporting units and related aggregates.
 *
 * <p>Supports searching reporting units, searching matching reporting-unit users, and aggregating
 * client/district-level statistics ("my forest clients"). Queries are executed via
 * {@link ReportingUnitRepository} and results are mapped to DTOs using MapStruct mappers.
 *
 * <p>Sorting is mapped to database columns; sort mappings are defined in {@code SORT_FIELDS} and
 * {@code SORT_DISTRICT_FIELDS}.
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
   * <p>If a specific client number filter is supplied (see #128 behavior), sorting is resolved via
   * {@link PaginationUtil#resolveSort(org.springframework.data.domain.Sort, String, Map)}. The
   * repository returns projection objects which are then mapped to
   * {@link ReportingUnitSearchResultDto}.
   *
   * @param filters           search filter DTO containing optional criteria
   * @param pageable          paging and sorting information
   * @param userClientNumbers client numbers derived from caller roles for scoping
   * @param currentUserId     current user id (used when requestByMe is selected)
   * @return page of {@link ReportingUnitSearchResultDto}
   */
  @NewSpan
  public Page<ReportingUnitSearchResultDto> search(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable,
      List<String> userClientNumbers,
      String currentUserId
  ) {

    enrichFilters(filters, userClientNumbers, currentUserId);

    log.debug("Searching reporting units with filters: {}, pageable: {}", filters, pageable);

    Sort resolvedSort = Objects.requireNonNull(
        PaginationUtil.resolveSort(
            pageable.getSort(),
            "ru_number",
            ServiceConstants.SORT_FIELDS
        ),
        "Resolved sort must not be null"
    );

    PageRequest pageRequest = PageRequest.of(
        pageable.getPageNumber(),
        pageable.getPageSize(),
        resolvedSort
    );

    if (!applyTimberMarkPreFilter(filters)) {
      return Page.empty(pageRequest);
    }

    return ruRepository
        .searchReportingUnits(filters, pageRequest)
        .map(ruSearchMapper::fromProjection);
  }

  /**
   * Narrows {@code filters.reportingUnitIds} to reporting units matching {@code filters.timberMark}
   * so the main query can drive off the reporting-unit primary key.
   *
   * @return {@code true} if the main search should proceed, or {@code false} if no results can
   *     match
   */
  private boolean applyTimberMarkPreFilter(ReportingUnitSearchParametersDto filters) {
    String rawTimberMark = filters.getTimberMark();
    if (rawTimberMark == null
        || rawTimberMark.isBlank()
        || LegacyConstants.NOVALUE.equalsIgnoreCase(rawTimberMark)) {
      return true;
    }

    String trimmedTimberMark = rawTimberMark.trim();
    filters.setTimberMark(trimmedTimberMark);

    List<Long> matchingRuIds = ruRepository.findReportingUnitIdsByTimberMark(trimmedTimberMark)
        .stream()
        .filter(Objects::nonNull)
        .map(Number::longValue)
        .toList();
    if (matchingRuIds.isEmpty()) {
      return false;
    }

    // Oracle rejects IN lists exceeding 1000 expressions (ORA-01795).
    if (matchingRuIds.size() > 1000) {
      log.warn(
          "Timber mark {} matched {} reporting units (>1000); skipping RU ID pre-filter",
          trimmedTimberMark,
          matchingRuIds.size()
      );
      return true;
    }

    // getReportingUnitIds() returns [-1L] as a sentinel when no RU ID filter is set.
    List<Long> existingRuIds = filters.getReportingUnitIds();
    if (existingRuIds.contains(-1L)) {
      filters.setReportingUnitIds(matchingRuIds);
      return true;
    }

    List<Long> intersected = matchingRuIds.stream()
        .filter(existingRuIds::contains)
        .toList();
    if (intersected.isEmpty()) {
      return false;
    }
    filters.setReportingUnitIds(intersected);
    return true;
  }

  private void enrichFilters(
      ReportingUnitSearchParametersDto filters,
      List<String> userClientNumbers,
      String currentUserId
  ) {

    if (shouldFallbackToUserClientNumbers(filters.getClientNumbers())) {
      filters.setClientNumbers(userClientNumbers);
    }

    if (filters.isRequestByMe()) {
      filters.setRequestUserId(currentUserId);
    }
  }

  private boolean shouldFallbackToUserClientNumbers(List<String> clientNumbers) {
    return CollectionUtils.isEmpty(clientNumbers)
        || (clientNumbers.size() == 1
        && LegacyConstants.NOVALUE.equalsIgnoreCase(clientNumbers.get(0)));
  }

  /**
   * Retrieve an expanded view of a reporting unit block with all associated search data.
   *
   * <p>Includes all related expanded data required for the search detail view. The repository
   * returns a projection object which is mapped to a
   * {@link ReportingUnitSearchExpandedDto}.
   *
   * @param reportingUnit reporting unit ID
   * @param wasteAssessmentAreaId waste assessment area ID
   * @return Optional containing expanded DTO if found, otherwise empty
   */
  public Optional<ReportingUnitSearchExpandedDto> getReportingUnitBlockExpanded(
      Long reportingUnit,
      Long wasteAssessmentAreaId
  ) {

    log.info(
        "Fetching expanded reporting unit block for RU: {}, wasteAssessmentAreaId: {}",
        reportingUnit,
        wasteAssessmentAreaId
    );

    return ruRepository
        .getSearchExpandedContent(reportingUnit, wasteAssessmentAreaId)
        .map(expandedMapper::fromProjection);
  }
}
