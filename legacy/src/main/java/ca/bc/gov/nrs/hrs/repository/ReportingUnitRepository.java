package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.search.ClientDistrictSearchProjection;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchExpandedProjection;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchProjection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * Repository for reporting-unit related queries and persistence operations.
 *
 * <p>This interface exposes custom native query methods used by the search endpoints
 * as well as the standard JPA CRUD operations inherited from {@link JpaRepository}. The custom
 * methods return projection interfaces to avoid loading full entities for search result pages.</p>
 */
@Repository
public interface ReportingUnitRepository extends JpaRepository<ReportingUnitEntity, Long> {

  /**
   * Execute a paged, parameterized native search for reporting units.
   *
   * <p>The query is defined in {@link ReportingUnitQueryConstants#SEARCH_REPORTING_UNIT_QUERY} and
   * a
   * separate count query is provided by
   * {@link ReportingUnitQueryConstants#SEARCH_REPORTING_UNIT_COUNT}. The {@code filter} parameter
   * is a DTO that supplies named parameters to the native query (via Spring's native query
   * parameter binding).</p>
   *
   * @param filter the search parameters bound into the query
   * @param page   the paging information
   * @return a page of {@link ReportingUnitSearchProjection} matching the filter
   */
  @Query(
      nativeQuery = true,
      value = ReportingUnitQueryConstants.SEARCH_REPORTING_UNIT_QUERY,
      countQuery = ReportingUnitQueryConstants.SEARCH_REPORTING_UNIT_COUNT
  )
  Page<ReportingUnitSearchProjection> searchReportingUnits(
      ReportingUnitSearchParametersDto filter,
      Pageable page
  );

  @Query(nativeQuery = true, value = ReportingUnitQueryConstants.GET_SEARCH_BLOCK_EXPANDED_CONTENT)
  Optional<ReportingUnitSearchExpandedProjection> getSearchExpandedContent(
      Long reportingUnit,
      Long blockId
  );

  /**
   * Search for user identifiers that match the supplied fragment using an approximate string
   * similarity algorithm.
   *
   * <p>The native query defined in {@link QueryConstants#SEARCH_USER} returns matching user
   * ids from entry and update user columns and filters by the supplied client number list.</p>
   *
   * @param userId        a fragment or identifier used to find similar user ids
   * @param clientNumbers the list of client numbers used to scope the search
   * @return a list of matching user identifiers
   */
  @Query(nativeQuery = true, value = QueryConstants.SEARCH_USER)
  List<String> searchReportingUnitUsers(
      String userId,
      List<String> clientNumbers
  );

  /**
   * Search client districts ("my forest clients") aggregated by client number.
   *
   * <p>The query uses multiple CTEs defined in {@link QueryConstants#MY_DISTRICTS_QUERY}
   * to compute per-client submission and block counts and the last update timestamp; the method
   * returns a paged projection {@link ClientDistrictSearchProjection}.</p>
   *
   * @param clientNumbers the clients to include in the aggregation
   * @param page          paging information
   * @return a page of {@link ClientDistrictSearchProjection} with aggregated client stats
   */
  @Query(
      nativeQuery = true,
      value = QueryConstants.MY_DISTRICTS_QUERY,
      countQuery = QueryConstants.MY_DISTRICTS_COUNT
  )
  Page<ClientDistrictSearchProjection> searchMyClients(
      List<String> clientNumbers,
      Pageable page
  );

}
