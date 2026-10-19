package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

  /**
   * Whether a live block exists in the PostgreSQL source for the given reporting unit and block id
   * — the source decision for the expanded-search route (DEC-019, issue #1238). Block-id-scoped on
   * purpose: the legacy WAA id space and the PostgreSQL block id space overlap numerically, so a
   * bare RU existence check is unsafe; only a {@code (reportingUnitId, blockId)} match proves the
   * request belongs to the PostgreSQL source (never cross-source, DEC-004).
   *
   * @param reportingUnitId the reporting unit id
   * @param blockId the block id (the {@code wasteAssessmentAreaId} path value on PostgreSQL rows)
   * @return true when a matching live block row exists
   */
  @Query(
      nativeQuery = true,
      value = ReportingUnitSearchQueryConstants.EXISTS_LIVE_BLOCK_QUERY)
  boolean existsLiveBlock(
      @Param("reportingUnitId") Long reportingUnitId, @Param("blockId") Long blockId);

  /**
   * Execute the expanded-search query for one {@code (reportingUnitId, blockId)} — the PostgreSQL
   * analog of the legacy Oracle expanded query. Returns at most one row; empty when no live block
   * matches.
   *
   * @param reportingUnitId the reporting unit id
   * @param blockId the block id
   * @return the expanded row, or empty when the block is absent/deleted
   */
  @Query(
      nativeQuery = true,
      value = ReportingUnitSearchQueryConstants.SEARCH_REPORTING_UNIT_EXPANDED_QUERY)
  Optional<ReportingUnitSearchExpandedRow> findExpanded(
      @Param("reportingUnitId") Long reportingUnitId, @Param("blockId") Long blockId);

  /**
   * Resolve the client number for a LIVE reporting unit from the PostgreSQL source — the
   * source-aware authorization lookup (DEC-019). Returns empty when no live RU matches, letting
   * the caller fall back to the legacy source without a cross-source merge (DEC-004).
   *
   * @param reportingUnitId the reporting unit id
   * @return the live RU's client number, or empty when the RU is absent/deleted
   */
  @Query(
      nativeQuery = true,
      value = ReportingUnitSearchQueryConstants.LIVE_CLIENT_NUMBER_QUERY)
  Optional<String> findLiveClientNumber(@Param("reportingUnitId") Long reportingUnitId);
}
