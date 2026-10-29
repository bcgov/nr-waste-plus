package ca.bc.gov.nrs.hrs.service;

import static java.util.stream.Collectors.toMap;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchSource;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.provider.search.PostgresReportingUnitSearchProvider;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/**
 * Service responsible for searching reporting units and client-related data.
 *
 * <p>This service delegates to {@link LegacyApiProvider} for legacy reporting unit queries and
 * enriches results with client and location details obtained via {@link ForestClientService}.
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class SearchService {

  /**
   * Substring the legacy search mapper strips from district descriptions for compact display
   * (legacy {@code MapperConstants.DISTRICT_AS_DTO}) — mirrored so PostgreSQL-sourced rows
   * present identically to legacy-sourced rows.
   */
  private static final String DISTRICT_NAME_SUFFIX = "Natural Resource District";

  private final LegacyApiProvider legacyApiProvider;
  private final PostgresReportingUnitSearchProvider postgresSearchProvider;
  private final ReportingUnitSearchRepository reportingUnitSearchRepository;
  private final ForestClientService forestClientService;
  private final UserService userService;
  private final FeatureFlagsConfiguration featureFlagsConfiguration;

  /**
   * Search reporting units using the supplied filters and pageable settings.
   *
   * <p>Results are enriched with client names and client location details by calling the Forest
   * Client service.
   *
   * <p>The search source (issue #1238, DEC-011) is resolved from the filters' {@code legacy}
   * flag: exactly {@code false} selects the PostgreSQL provider, any other value selects the
   * legacy provider. Exactly one source is used per request; the legacy branch keeps the
   * original behavior unchanged, and the PostgreSQL branch fails with HTTP 501 without falling
   * back (DEC-002, DEC-004).
   *
   * @param userId the current user
   * @param filters search filters
   * @param pageable paging parameters
   * @return a page of {@link ReportingUnitSearchResultDto} enriched with client info
   */
  @NewSpan
  public Page<ReportingUnitSearchResultDto> search(
      String userId, ReportingUnitSearchParametersDto filters, Pageable pageable) {

    if (filters != null
        && filters.isBookmarked()
        && featureFlagsConfiguration.isEnabled(FeatureFlag.BOOKMARK_REPORTING_UNIT_ENABLED)) {
      filters.setReportingUnitIds(userService.getUserBookmarksInList(userId, List.of()));
    }

    // Exactly one source per request; never merge results and never fall back across sources
    // (DEC-004).
    var source =
        ReportingUnitSearchSource.fromLegacyParam(filters == null ? null : filters.getLegacy());
    var searchFilters = filters == null ? new ReportingUnitSearchParametersDto() : filters;
    var result =
        switch (source) {
          case LEGACY -> legacyApiProvider.searchReportingUnit(searchFilters, pageable);
          case POSTGRES -> postgresSearchProvider.searchReportingUnit(searchFilters, pageable);
        };

    // PostgreSQL rows ship NULL district descriptions (DEC-016); legacy rows arrive with them
    // populated by the legacy SQL joins. Enrichment is therefore PostgreSQL-gated so legacy-row
    // output is provably unchanged (issue #1238, D5; DEC-009 — lookup is enrichment, never a
    // row-source fallback).
    if (source == ReportingUnitSearchSource.POSTGRES) {
      result = enrichDistrictDescriptions(result);
    }

    // Build a map of clients and load details from Forest Client Service
    var clients =
        result.stream()
            .map(ReportingUnitSearchResultDto::client)
            .distinct()
            .map(
                client ->
                    forestClientService
                        .getClientByNumber(client.code())
                        .map(forestClientDto -> client.withDescription(forestClientDto.name()))
                        .orElse(client))
            .collect(toMap(CodeDescriptionDto::code, client -> client));

    var reportingUnitsInPage = result.stream().map(ReportingUnitSearchResultDto::ruNumber).toList();

    var bookmarkedEntries =
        featureFlagsConfiguration.isEnabled(FeatureFlag.BOOKMARK_REPORTING_UNIT_ENABLED)
            ? userService.getUserBookmarksInList(userId, reportingUnitsInPage)
            : List.of();

    // Enrich the results with client and location details
    return result
        .map(
            entry ->
                entry.withId(
                    String.format(
                        "RU-%d-Block-%s-%d",
                        entry.ruNumber(),
                        Objects.toString(entry.wasteAssessmentAreaId(), "N/A"),
                        entry.hashCode())))
        .map(entry -> entry.withClient(clients.get(entry.client().code())))
        .map(entry -> entry.withBookmarked(bookmarkedEntries.contains(entry.ruNumber())));
  }

  /**
   * Get expanded search details for a specific reporting unit and block, routed to the correct
   * source (DEC-019).
   *
   * <p>The source is decided by a BLOCK-ID-scoped existence test in PostgreSQL ({@code
   * (reportingUnitId, blockId)} live block) — never by numeric id alone, because the legacy WAA id
   * space and the PostgreSQL block id space overlap. A match selects the PostgreSQL expanded query;
   * otherwise the request belongs to the legacy source. The legacy WAA identity maps 1:1 onto
   * {@code wasteplus.block.block_id}, so the path's {@code wasteAssessmentAreaId} is the block id on
   * PostgreSQL rows. Sources are never merged and never fall back across each other (DEC-004).
   *
   * @param ruId the reporting unit id
   * @param wasteAssessmentAreaId the waste assessment area id (the block id on PostgreSQL rows)
   * @return the expanded reporting unit search details
   */
  @NewSpan
  public ReportingUnitSearchExpandedDto getSearchExpanded(Long ruId, Long wasteAssessmentAreaId) {
    log.info(
        "Loading expanded search for ruId: {}, wasteAssessmentAreaId: {}",
        ruId,
        wasteAssessmentAreaId);
    if (isPostgresRow(ruId, wasteAssessmentAreaId)) {
      return postgresSearchProvider.getSearchExpanded(ruId, wasteAssessmentAreaId)
          .orElseThrow(() -> new NotFoundGenericException("Reporting unit block"));
    }
    return legacyApiProvider.getSearchExpanded(ruId, wasteAssessmentAreaId);
  }

  /**
   * Whether the given {@code (reportingUnitId, blockId)} resolves to the PostgreSQL source — the
   * block-id-scoped existence test that both the expanded query and its authorization must share
   * (DEC-019).
   *
   * @param reportingUnitId the reporting unit id
   * @param blockId the block id (the {@code wasteAssessmentAreaId} path value)
   * @return true when a live block matches in PostgreSQL
   */
  private boolean isPostgresRow(Long reportingUnitId, Long blockId) {
    return blockId != null
        && reportingUnitSearchRepository.existsLiveBlock(reportingUnitId, blockId);
  }

  /**
   * Look up the client number associated with a reporting unit, routed to the correct source
   * (DEC-019).
   *
   * <p>Authorization must read the same source the expanded query will read, otherwise a
   * PostgreSQL-only reporting unit would be authorized against a legacy table that has no row. The
   * source is decided by the same block-id-scoped PostgreSQL existence test as the expanded query;
   * a match reads the client number from {@code wasteplus.reporting_unit}, otherwise the legacy API is
   * consulted. Never a cross-source merge (DEC-004).
   *
   * @param reportingUnitId the reporting unit id
   * @param wasteAssessmentAreaId the waste assessment area id (the block id on PostgreSQL rows)
   * @return the client number associated with the reporting unit
   * @throws ca.bc.gov.nrs.hrs.exception.NotFoundGenericException if the reporting unit is not found
   *     in either source
   */
  @NewSpan
  public String getClientNumberForReportingUnit(
      Long reportingUnitId, Long wasteAssessmentAreaId) {
    if (isPostgresRow(reportingUnitId, wasteAssessmentAreaId)) {
      return reportingUnitSearchRepository.findLiveClientNumber(reportingUnitId)
          .orElseThrow(() -> new NotFoundGenericException("Reporting unit"));
    }
    return legacyApiProvider.getReportingUnitDetails(reportingUnitId).clientNumber();
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
   * <p>When a textual value is provided the method filters clients accordingly and may return an
   * empty page if none match.
   *
   * @param pageable paging parameters
   * @param value optional filter value
   * @param allClients list of clients to consider
   * @return a page of {@link MyForestClientSearchResultDto} enriched with client info
   */
  @NewSpan
  public Page<MyForestClientSearchResultDto> searchByMyForestClient(
      Pageable pageable, String value, List<String> allClients) {
    log.info(
        "Loading my clients with filter: {}, pageable: {}, possible values: {}",
        value,
        pageable,
        allClients);
    // #127 if we have a value to filter by, we need to load only those clients
    Map<String, CodeDescriptionDto> response =
        StringUtils.isNotBlank(value) ? mapClients(allClients, value) : new HashMap<>();

    if (StringUtils.isNotBlank(value)) {
      log.info("Filtering search by clients: {}", response.keySet());

      if (response.isEmpty()) {
        return new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
      }
    }

    Page<MyForestClientSearchResultDto> page =
        legacyApiProvider.searchMyClients(response.keySet(), pageable);

    List<String> clients = page.stream().map(entry -> entry.client().code()).toList();

    // #127 if we don't have a value to filter by, we need to load all clients in the page
    if (StringUtils.isBlank(value)) {
      response.putAll(mapClients(clients, null));
    }

    return page.map(
        entry -> entry.withClient(response.getOrDefault(entry.client().code(), entry.client())));
  }

  /**
   * Fill NULL district descriptions on PostgreSQL-sourced rows from the legacy district code
   * list (OQ-004: one bounded full-list call per page, no caching, no batch endpoint needed).
   *
   * <p>The lookup is ENRICHMENT only (DEC-009): it never filters rows, never switches source,
   * and never fails the request — the circuit-breaker fallback (default districts) supplies
   * whatever it can and unknown codes simply keep their NULL description. Descriptions get the
   * legacy mapper's stripping rule applied so both sources present identically. Rows whose
   * description is already populated are left untouched, and the lookup is skipped entirely when
   * there is nothing to fill.
   *
   * @param result the PostgreSQL-sourced page
   * @return the page with district descriptions filled where possible
   */
  private Page<ReportingUnitSearchResultDto> enrichDistrictDescriptions(
      Page<ReportingUnitSearchResultDto> result) {

    List<String> codes =
        result.stream()
            .filter(entry -> entry.district() != null && entry.district().description() == null)
            .map(entry -> entry.district().code())
            .filter(StringUtils::isNotBlank)
            .distinct()
            .toList();

    if (codes.isEmpty()) {
      return result;
    }

    try {
      Map<String, String> descriptions = new HashMap<>();
      legacyApiProvider
          .getDistrictCodes()
          .forEach(
              code ->
                  descriptions.putIfAbsent(
                      code.code(),
                      code.description() == null
                          ? null
                          : code.description()
                              .replaceAll(DISTRICT_NAME_SUFFIX, "")
                              .trim()));

      return result.map(
          entry -> {
            if (entry.district() == null || entry.district().description() != null) {
              return entry;
            }
            String description = descriptions.get(entry.district().code());
            return description == null
                ? entry
                : entry.withDistrict(
                    new CodeDescriptionDto(entry.district().code(), description));
          });
    } catch (RuntimeException e) {
      log.warn("District description enrichment skipped: {}", e.getMessage());
      return result;
    }
  }

  private Map<String, CodeDescriptionDto> mapClients(List<String> clients, String value) {
    return forestClientService.searchByClientNumbers(0, clients.size(), clients, value).stream()
        .map(entry -> new CodeDescriptionDto(entry.clientNumber(), entry.name()))
        .collect(Collectors.toMap(CodeDescriptionDto::code, client -> client));
  }
}
