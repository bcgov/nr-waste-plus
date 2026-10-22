package ca.bc.gov.nrs.hrs.provider.search;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.SearchExpandedSecondaryDto;
import ca.bc.gov.nrs.hrs.exception.InvalidSortingFieldException;
import ca.bc.gov.nrs.hrs.repository.PostgresReportingUnitSearchFilter;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchExpandedRow;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchQueryConstants;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchRepository;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitSearchRow;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.observation.annotation.Observed;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * PostgreSQL reporting-unit search provider (issue #1238, D3b) — the {@link
 * ReportingUnitSearchProvider} implementation for the {@code POSTGRES} source.
 *
 * <p>Mirrors the legacy search flow: resolve the client scope from the principal (DEC-008,
 * legacy {@code enrichFilters} parity), build the normalized {@link
 * PostgresReportingUnitSearchFilter}, resolve the sort through the {@code SORT_EXPRESSIONS}
 * allowlist (rejecting unknown and degenerate keys, HTTP 428), then make ONE repository call
 * with the legacy two-parameter shape {@code (filter, page)}. Rows map to the shared {@link
 * ReportingUnitSearchResultDto} per DEC-014 and DEC-016; {@code id} and {@code bookmarked} stay
 * service-level ({@code SearchService} generates them for both sources).
 *
 * <p>Results come exclusively from the PostgreSQL statements — never merged with, and never a
 * fallback for, the legacy source (DEC-004). The resolved sort travels inside the Pageable as
 * {@code JpaSort.unsafe} fragments from the constants-file allowlist — never raw user input —
 * the legacy {@code PaginationUtil} mechanism.
 */
@Component
@Observed
@Slf4j
@RequiredArgsConstructor
public class PostgresReportingUnitSearchProvider implements ReportingUnitSearchProvider {

  /** Reused JSON parser for the expanded row's {@code secondary} text (legacy mapper parity). */
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  private static final TypeReference<List<SearchExpandedSecondaryDto>> SECONDARY_TYPE_REF =
      new TypeReference<>() {};

  private final ReportingUnitSearchRepository searchRepository;

  /**
   * Search reporting units in the PostgreSQL source using the provided filters and pageable.
   *
   * @param filters search filters to apply (binding contract applied via the filter object)
   * @param pageable pagination information with a {@code PageableDefault}-backed sort
   * @return a page of {@link ReportingUnitSearchResultDto} from the PostgreSQL source only
   * @throws InvalidSortingFieldException when the requested sort key is outside the PostgreSQL
   *     allowlist (unknown or degenerate keys, legacy reject parity, HTTP 428)
   * @throws ResponseStatusException with HTTP 400 when a digits-only {@code mainSearchTerm}
   *     cannot be represented as a reporting-unit id (documented robustness deviation from
   *     legacy's ORA-01722 500)
   */
  @Override
  public Page<ReportingUnitSearchResultDto> searchReportingUnit(
      ReportingUnitSearchParametersDto filters, Pageable pageable) {

    if (filters != null
        && filters.isBookmarked()
        && CollectionUtils.isEmpty(filters.getReportingUnitIds())) {
      return Page.empty(pageable);
    }

    List<String> clientNumbers = resolveClientScope(filters.getClientNumbers());
    PostgresReportingUnitSearchFilter filter =
        PostgresReportingUnitSearchFilter.from(filters, clientNumbers);

    Page<ReportingUnitSearchRow> rows =
        searchRepository.searchReportingUnits(filter, resolvePage(pageable));

    return rows.map(this::toDto);
  }

  /**
   * Map one query row to the shared search DTO (spec §6 mapping matrix).
   *
   * @param row the projected PostgreSQL row (quoted camelCase aliases)
   * @return the DTO with service-level fields ({@code id}, {@code bookmarked}) left for
   *     {@code SearchService}
   */
  private ReportingUnitSearchResultDto toDto(ReportingUnitSearchRow row) {
    return new ReportingUnitSearchResultDto(
        null,
        row.getWasteAssessmentAreaId(),
        row.getCutBlockId(),
        row.getRuNumber(),
        new CodeDescriptionDto(row.getClientCode(), row.getClientName()),
        row.getLicenseNumber(),
        row.getCuttingPermit(),
        row.getTimberMark(),
        Boolean.TRUE.equals(row.getMultiMark()),
        Boolean.TRUE.equals(row.getSecondaryEntry()),
        new CodeDescriptionDto(row.getSamplingCode(), row.getSamplingName()),
        new CodeDescriptionDto(row.getDistrictCode(), row.getDistrictName()),
        new CodeDescriptionDto(row.getStatusCode(), row.getStatusName()),
        toLocalDateTime(row.getLastUpdated()),
        false);
  }

  /**
   * Execute the PostgreSQL expanded-search query for one {@code (reportingUnitId, blockId)} (issue
   * #1238, expanded search; DEC-018/DEC-019). The legacy WAA identity maps 1:1 onto {@code
   * hrs.block.block_id}, so the path's {@code wasteAssessmentAreaId} is the block id on PostgreSQL
   * rows.
   *
   * @param reportingUnitId the reporting unit id
   * @param blockId the block id (the {@code wasteAssessmentAreaId} path value)
   * @return the expanded DTO, or empty when no live block matches (the caller decides routing)
   */
  @Observed
  public Optional<ReportingUnitSearchExpandedDto> getSearchExpanded(
      Long reportingUnitId, Long blockId) {
    return searchRepository.findExpanded(reportingUnitId, blockId)
        .map(this::toExpandedDto);
  }

  /**
   * Map one expanded query row to {@link ReportingUnitSearchExpandedDto}, mirroring the legacy
   * {@code ReportingUnitSearchExpandedMapper}: {@code status} and {@code attachment} become {@link
   * CodeDescriptionDto} (attachment always constructed, code stringified — legacy parity),
   * {@code secondary} JSON text is parsed into {@code secondaryMarks}, and the no-source fields
   * ({@code markArea}, {@code statusName}, per-mark status/area) stay NULL (DEC-016/DEC-018).
   *
   * @param row the projected expanded PostgreSQL row (quoted camelCase aliases)
   * @return the expanded DTO
   */
  private ReportingUnitSearchExpandedDto toExpandedDto(ReportingUnitSearchExpandedRow row) {
    return new ReportingUnitSearchExpandedDto(
        row.getId(),
        row.getLicenseNo(),
        row.getCuttingPermit(),
        row.getTimberMark(),
        Boolean.TRUE.equals(row.getExempted()),
        Boolean.TRUE.equals(row.getMultiMark()),
        new CodeDescriptionDto(row.getStatusCode(), row.getStatusName()),
        parseSecondaryJson(row.getSecondary()),
        toDouble(row.getNetArea()),
        toDouble(row.getMarkArea()),
        row.getSubmitter(),
        new CodeDescriptionDto(Objects.toString(row.getAttachmentId(), null),
            row.getAttachmentName()),
        row.getComments(),
        row.getTotalBlockCount(),
        row.getTotalChildCount());
  }

  /**
   * Null-safe {@code BigDecimal} → {@code Double} for the area fields.
   *
   * @param value the numeric area (may be null)
   * @return the double value, or {@code null} when absent
   */
  private Double toDouble(BigDecimal value) {
    return value == null ? null : value.doubleValue();
  }

  /**
   * Parse the expanded row's {@code secondary} JSON text into a list of {@link
   * SearchExpandedSecondaryDto} — the legacy {@code ReportingUnitSearchExpandedMapper.
   * parseSecondaryJson} parity: null/blank or unparseable input yields an empty list.
   *
   * @param json the JSON-array text of the block's SECONDARY marks (may be null)
   * @return the parsed secondary marks; never null, empty when absent/unparseable
   */
  private List<SearchExpandedSecondaryDto> parseSecondaryJson(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }
    try {
      return OBJECT_MAPPER.readValue(json, SECONDARY_TYPE_REF);
    } catch (Exception e) {
      log.error("Failed to parse secondary marks JSON: {}", json, e);
      return List.of();
    }
  }

  /**
   * Pin the {@code timestamptz} → {@code LocalDateTime} conversion to UTC, matching the
   * codebase convention for RU timestamps ({@code ReportingUnitBlockService}). Regional
   * interpretation is the OQ-005/V1 (GAP-014) domain.
   *
   * @param instant the instant read from {@code ru.updated_at}
   * @return the UTC-pinned local date-time, or {@code null} when absent
   */
  private LocalDateTime toLocalDateTime(Instant instant) {
    return instant == null ? null : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
  }

  /**
   * Resolve the client scope for the PostgreSQL source (DEC-008, legacy {@code enrichFilters}
   * parity). An absent, empty, or single-{@code 'NOVALUE'} list is replaced with the
   * principal-derived list; an explicit non-empty list binds verbatim (a list that merely
   * CONTAINS the sentinel still binds verbatim — the SQL sentinel disjunct then neutralizes the
   * client filter, which is filter neutralization, never an authorization grant).
   *
   * @param requested the raw {@code clientNumbers} filter
   * @return the effective client-number list; never null or empty
   * @throws ResponseStatusException with HTTP 403 when a non-IDIR principal has no role-derived
   *     client scope
   */
  private List<String> resolveClientScope(List<String> requested) {
    if (!isUnscoped(requested)) {
      return List.copyOf(requested);
    }
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
      throw new IllegalStateException("JWT not available");
    }
    boolean idir =
        IdentityProvider.IDIR.equals(JwtPrincipalUtil.getIdentityProvider(jwtAuth.getToken()));
    return deriveClientScope(idir, JwtPrincipalUtil.getClientFromRoles(jwtAuth.getToken()));
  }

  /**
   * Whether the requested client list carries no scope and must be derived from the principal.
   *
   * @param requested the raw {@code clientNumbers} filter; may be null
   * @return true when absent, empty, or exactly the single {@code 'NOVALUE'} sentinel
   */
  static boolean isUnscoped(List<String> requested) {
    return CollectionUtils.isEmpty(requested)
        || (requested.size() == 1
            && ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE.equals(requested.getFirst()));
  }

  /**
   * Principal-derived client scope (DEC-008): IDIR is unrestricted regardless of roles; non-IDIR
   * callers must have at least one role-derived client number or the request is denied. The SQL
   * sentinel is reserved for the IDIR unrestricted case and is never used to represent missing
   * non-IDIR authorization scope.
   *
   * @param idir whether the principal authenticates via IDIR
   * @param roleClients the client numbers mapped from the principal's roles
   * @return the derived client list to bind; never null or empty
   * @throws ResponseStatusException with HTTP 403 when a non-IDIR principal has no role-derived
   *     client scope
   */
  static List<String> deriveClientScope(boolean idir, List<String> roleClients) {
    if (idir) {
      return List.of(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
    }
    if (CollectionUtils.isEmpty(roleClients)) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "No client scope is assigned to this principal");
    }
    return List.copyOf(roleClients);
  }

  /**
   * Resolve the Pageable sort through the {@code SORT_EXPRESSIONS} allowlist and always append
   * the deterministic tie-breakers (spec §4), as {@code JpaSort.unsafe} fragments inside the
   * Pageable — the legacy {@code PaginationUtil.resolveSort} mechanism. Unknown or degenerate
   * keys (not in the map) are rejected with {@link InvalidSortingFieldException} (legacy reject
   * parity, HTTP 428). An unsorted request falls back to the default {@code lastUpdated DESC}.
   * Every fragment is a fixed constant from the query-constants file — never user-controlled
   * text.
   *
   * @param pageable the incoming pagination with sort
   * @return the page request with the mapped, tie-breaker-completed sort
   */
  Pageable resolvePage(Pageable pageable) {
    return PageRequest.of(
        pageable.getPageNumber(), pageable.getPageSize(), resolveSort(pageable.getSort()));
  }

  /**
   * Map a sort to the allowlisted {@code JpaSort.unsafe} fragments plus tie-breakers.
   *
   * <p>Each fragment is wrapped in parentheses — the legacy {@code SORT_FIELDS} trick ("parentheses
   * required so JpaSort.unsafe sorts using the SELECT alias"): Spring Data's native-query sort
   * rendering leaves only function-like (parenthesized) expressions, selection aliases, and
   * join-alias-prefixed properties untouched, and otherwise prefixes them with the entity alias
   * detected from the query text (observed live: {@code ru.updated_at} became {@code
   * ru.ru.updated_at}). Parenthesized fragments take the raw-expression path and reach
   * PostgreSQL byte-identical.
   *
   * @param sort the incoming sort
   * @return the mapped, tie-breaker-completed unsafe sort
   */
  JpaSort resolveSort(Sort sort) {
    JpaSort resolved = null;
    for (Sort.Order order : sort) {
      String fragment = ReportingUnitSearchQueryConstants.SORT_EXPRESSIONS.get(order.getProperty());
      if (fragment == null) {
        throw new InvalidSortingFieldException(order.getProperty());
      }
      resolved = resolved == null
          ? JpaSort.unsafe(order.getDirection(), "(" + fragment + ")")
          : resolved.andUnsafe(order.getDirection(), "(" + fragment + ")");
    }
    if (resolved == null) {
      resolved = JpaSort.unsafe(
          Sort.Direction.DESC,
          "(" + ReportingUnitSearchQueryConstants.DEFAULT_SORT_EXPRESSION + ")");
    }
    return resolved
        .andUnsafe(
            Sort.Direction.ASC,
            "(" + ReportingUnitSearchQueryConstants.TIE_BREAKER_RU_NUMBER + ")")
        .andUnsafe(
            Sort.Direction.ASC,
            "(" + ReportingUnitSearchQueryConstants.TIE_BREAKER_BLOCK_ID + ")");
  }
}
