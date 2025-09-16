package ca.bc.gov.nrs.hrs.repository;

import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.entity.search.ClientDistrictSearchProjection;
import ca.bc.gov.nrs.hrs.entity.search.ReportingUnitSearchProjection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportingUnitRepository extends JpaRepository<ReportingUnitEntity, Long> {

  @Query(
      nativeQuery = true,
      value = QueryConstants.SEARCH_REPORTING_UNIT_QUERY,
      countQuery = QueryConstants.SEARCH_REPORTING_UNIT_COUNT
  )
  Page<ReportingUnitSearchProjection> searchReportingUnits(
      ReportingUnitSearchParametersDto filter,
      Pageable page
  );

  @Query(nativeQuery = true, value = QueryConstants.SEARCH_USER)
  List<String> searchReportingUnitUsers(
      String userId,
      List<String> clientNumbers
  );

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
