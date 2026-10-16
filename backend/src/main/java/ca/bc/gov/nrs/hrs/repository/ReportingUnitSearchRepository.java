package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * Read-only Spring Data repository for the PostgreSQL reporting-unit search source (issue #1238)
 * — the legacy two-parameter shape: the filter object carries the resolved, normalized values
 * (its getters own the sentinel/uppercase contract) and the Pageable carries the allowlisted
 * sort plus paging. Parameters are referenced from the constants-file SQL via SpEL
 * ({@code :#{#filter.district}}), exactly like the legacy
 * {@code ReportingUnitRepository.searchReportingUnits}.
 *
 * <p>The shared modern {@code ReportingUnitSearchParametersDto} deliberately does NOT carry
 * normalizing getters (it would break the controller's BCeID client validation) — see
 * {@link PostgresReportingUnitSearchFilter}. Silently-ignored filters (DEC-015) have no getter
 * and therefore no predicate.
 */
@Repository
public interface ReportingUnitSearchRepository extends JpaRepository<ReportingUnitEntity, Long> {

  /**
   * Execute the paged PostgreSQL reporting-unit list search against the exact row set of the
   * COUNT statement (shared fragment in the constants file).
   *
   * @param filter the resolved, normalized search filter
   * @param page paging with the allowlisted, tie-breaker-completed sort
   * @return one page of {@link ReportingUnitSearchRow} from the PostgreSQL source only
   */
  @Query(
      nativeQuery = true,
      value = ReportingUnitSearchQueryConstants.SEARCH_REPORTING_UNIT_QUERY,
      countQuery = ReportingUnitSearchQueryConstants.SEARCH_REPORTING_UNIT_COUNT)
  Page<ReportingUnitSearchRow> searchReportingUnits(
      PostgresReportingUnitSearchFilter filter, Pageable page);
}
