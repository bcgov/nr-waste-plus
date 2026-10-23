package ca.bc.gov.nrs.hrs.provider.search;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Seam for the reporting-unit search sources introduced by issue #1238.
 *
 * <p>Each search request resolves to exactly one source ({@link
 * ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchSource}); implementations never merge results
 * from different sources and never act as a fallback for another source when a source returns
 * empty results or fails (DEC-004). All implementations return the same response type, {@code
 * Page<ReportingUnitSearchResultDto>} (DEC-005).
 *
 * <p>The legacy implementation is {@link ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider}; the
 * PostgreSQL implementation is currently an explicit V0 stub ({@link
 * PostgresReportingUnitSearchProvider}).
 */
public interface ReportingUnitSearchProvider {

  /**
   * Search reporting units in this provider's source using the provided filters and pageable.
   *
   * @param filters search filters to apply
   * @param pageable pagination information
   * @return a page of {@link ReportingUnitSearchResultDto} sourced exclusively from this provider;
   *     never a merged or cross-source result
   */
  Page<ReportingUnitSearchResultDto> searchReportingUnit(
      ReportingUnitSearchParametersDto filters, Pageable pageable);
}
