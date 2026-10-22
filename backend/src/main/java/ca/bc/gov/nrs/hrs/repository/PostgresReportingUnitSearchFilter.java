package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import java.util.List;
import java.util.Locale;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * Resolved filter carrier for the PostgreSQL reporting-unit search (issue #1238) — the
 * two-parameter repository shape mirroring the legacy
 * {@code ReportingUnitRepository.searchReportingUnits(filter, page)} call.
 *
 * <p>DEVIATION FROM LEGACY (deliberate, issue #1238): the legacy query binds its shared
 * {@code ReportingUnitSearchParametersDto} directly, whose getters own the sentinel
 * normalization. The shared modern DTO must stay field-clean: the search controller's BCeID
 * validation reads {@code getClientNumbers()} raw, so normalizing getters there would replace
 * every BCeID caller's absent client filter with the sentinel and reject legitimate searches (a
 * D2 regression guarded by the controller integration tests). This filter therefore owns the
 * normalization one layer down, with the same getter contract: getters never return null or
 * empty collections — absent filters bind the {@code 'NOVALUE'} / {@code -1} sentinels.
 *
 * <p>Sentinels are FILTER-NEUTRALIZATION values only, NEVER authorization: client scope is
 * derived from the JWT (DEC-008) before this filter is built, and a bound {@code 'NOVALUE'} is
 * never an authorization grant. Silently-ignored filters (DEC-015: sampling, status, multiMark,
 * requestByMe/requestUserId, dates) are dropped at construction — they have no getter and
 * therefore no predicate.
 */
public final class PostgresReportingUnitSearchFilter {

  private final String mainSearchTerm;
  private final List<String> district;
  private final List<String> clientNumbers;
  private final List<Long> reportingUnitIds;
  private final String licenseeId;
  private final String cuttingPermitId;
  private final String timberMark;

  private PostgresReportingUnitSearchFilter(
      String mainSearchTerm,
      List<String> district,
      List<String> clientNumbers,
      List<Long> reportingUnitIds,
      String licenseeId,
      String cuttingPermitId,
      String timberMark) {
    this.mainSearchTerm = mainSearchTerm;
    this.district = district;
    this.clientNumbers = clientNumbers;
    this.reportingUnitIds = reportingUnitIds;
    this.licenseeId = licenseeId;
    this.cuttingPermitId = cuttingPermitId;
    this.timberMark = timberMark;
  }

  /**
   * Build the filter from the raw search parameters plus the already scope-resolved client list
   * (DEC-008 derivation happens provider-side before this call).
   *
   * <p>Rejects a digits-only {@code mainSearchTerm} that exceeds the PostgreSQL {@code bigint}
   * range with HTTP 400 (documented robustness deviation from legacy's ORA-01722 500); leading
   * zero-padded representable terms pass (legacy {@code TO_NUMBER} parity).
   *
   * @param filters the raw search filters
   * @param scopedClientNumbers the scope-resolved client numbers; null/empty binds the sentinel
   * @return the filter with getter-side normalization
   * @throws ResponseStatusException with HTTP 400 when the numeric search term is out of range
   */
  public static PostgresReportingUnitSearchFilter from(
      ReportingUnitSearchParametersDto filters, List<String> scopedClientNumbers) {
    String mainSearchTerm = StringUtils.trimToNull(filters.getMainSearchTerm());
    if (StringUtils.isNotBlank(mainSearchTerm) && mainSearchTerm.matches("\\d+")) {
      try {
        Long.parseLong(mainSearchTerm);
      } catch (NumberFormatException e) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "numeric search term out of range");
      }
    }
    return new PostgresReportingUnitSearchFilter(
        mainSearchTerm,
        filters.getDistrict(),
        scopedClientNumbers,
        filters.getReportingUnitIds(),
        filters.getLicenseeId(),
        filters.getCuttingPermitId(),
        filters.getTimberMark());
  }

  /**
   * Digits-only reporting-unit search term for the lazy {@code CAST(as bigint)} CASE; an
   * absent/blank term binds the {@code 'NOVALUE'} sentinel (never null — untyped-null binds fail
   * PostgreSQL prepare) and neutralizes the filter. Uppercasing is a no-op for the digits
   * branch, so the term binds as-is.
   *
   * @return the search term or the sentinel; never null or blank
   */
  public String getMainSearchTerm() {
    return StringUtils.isBlank(mainSearchTerm)
        ? ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE
        : mainSearchTerm;
  }

  /**
   * District codes uppercased at binding (legacy {@code toMultiMap} precedent); absent/empty
   * binds the {@code 'NOVALUE'} sentinel — never null or empty (Hibernate collection binding
   * contract).
   *
   * @return the uppercased district codes or the sentinel list; never null or empty
   */
  public List<String> getDistrict() {
    if (CollectionUtils.isEmpty(district)) {
      return List.of(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
    }
    return district.stream().map(value -> value.toUpperCase(Locale.ROOT)).toList();
  }

  /**
   * Client numbers as-is (legacy never uppercases them) — already scope-resolved by the
   * provider (DEC-008); the getter only enforces the never-null/empty binding contract.
   *
   * @return the scoped client numbers or the sentinel list; never null or empty
   */
  public List<String> getClientNumbers() {
    if (CollectionUtils.isEmpty(clientNumbers)) {
      return List.of(ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE);
    }
    return List.copyOf(clientNumbers);
  }

  /**
   * Reporting-unit ids as-is; absent/empty binds the {@code -1} sentinel — never null or empty.
   *
   * @return the reporting-unit ids or the sentinel list; never null or empty
   */
  public List<Long> getReportingUnitIds() {
    if (CollectionUtils.isEmpty(reportingUnitIds)) {
      return List.of(ReportingUnitSearchQueryConstants.SENTINEL_REPORTING_UNIT);
    }
    return List.copyOf(reportingUnitIds);
  }

  /**
   * Forest-file filter uppercased at binding; absent/blank binds the {@code 'NOVALUE'} sentinel.
   *
   * @return the uppercased forest-file filter or the sentinel; never null or blank
   */
  public String getLicenseeId() {
    return upperOrSentinel(licenseeId);
  }

  /**
   * Cutting-permit filter uppercased at binding; absent/blank binds the {@code 'NOVALUE'}
   * sentinel.
   *
   * @return the uppercased cutting-permit filter or the sentinel; never null or blank
   */
  public String getCuttingPermitId() {
    return upperOrSentinel(cuttingPermitId);
  }

  /**
   * Timber-mark filter uppercased at binding; absent/blank binds the {@code 'NOVALUE'} sentinel.
   *
   * @return the uppercased timber-mark filter or the sentinel; never null or blank
   */
  public String getTimberMark() {
    return upperOrSentinel(timberMark);
  }

  private static String upperOrSentinel(String value) {
    return StringUtils.isBlank(value)
        ? ReportingUnitSearchQueryConstants.SENTINEL_NOVALUE
        : value.toUpperCase(Locale.ROOT);
  }
}
