package ca.bc.gov.nrs.hrs.provider.legacy;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.search.MyForestClientSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

/**
 * Facade provider for calls to the legacy backend API.
 *
 * <p>
 * This class keeps a stable API for service-layer callers while delegating to
 * smaller, capability-focused clients:
 * {@link LegacyCodesClient}, {@link LegacyReportingUnitClient}, and
 * {@link LegacyMyForestClientClient}.
 * </p>
 */
@Component
@Observed
@RequiredArgsConstructor
public class LegacyApiProvider {

  private final LegacyCodesClient codesClient;
  private final LegacyReportingUnitClient reportingUnitClient;
  private final LegacyMyForestClientClient myForestClientClient;

  /**
   * Retrieve district code list from the legacy API.
   */
  public List<CodeDescriptionDto> getDistrictCodes() {
    return codesClient.getDistrictCodes();
  }

  /**
   * Retrieve sampling codes from the legacy API.
   */
  public List<CodeDescriptionDto> getSamplingCodes() {
    return codesClient.getSamplingCodes();
  }

  /**
   * Retrieve status codes from the legacy API.
   */
  public List<CodeDescriptionDto> getStatusCodes() {
    return codesClient.getStatusCodes();
  }

  /**
   * Search reporting units in the legacy API using provided filters and pageable information.
   *
   * <p>The legacy API responds with a paged payload; the delegated client converts
   * the content into a {@link Page} of {@link ReportingUnitSearchResultDto}.</p>
   *
   * @param filters  search filters to apply
   * @param pageable pageable information to include in the request
   * @return a {@link Page} of {@link ReportingUnitSearchResultDto}
   */
  public Page<ReportingUnitSearchResultDto> searchReportingUnit(
      ReportingUnitSearchParametersDto filters,
      Pageable pageable
  ) {
    return reportingUnitClient.searchReportingUnit(filters, pageable);
  }

  /**
   * Retrieve expanded search details for a specific reporting unit and waste assessment area.
   *
   * @param ruId    the reporting unit ID
   * @param wasteAssessmentAreaId the waste assessment area ID
   * @return a {@link ReportingUnitSearchExpandedDto} with expanded details
   */
  public ReportingUnitSearchExpandedDto getSearchExpanded(Long ruId, Long wasteAssessmentAreaId) {
    return reportingUnitClient.getSearchExpanded(ruId, wasteAssessmentAreaId);
  }

  /**
   * Search for reporting unit users that match a partial user id.
   *
   * <p>Returns a list of user ids as strings.</p>
   *
   * @param userId the search term for user id
   * @return a list of matching user ids
   */
  public List<String> searchReportingUnitUsers(String userId) {
    return reportingUnitClient.searchReportingUnitUsers(userId);
  }

  /**
   * Search "My Forest" clients in the legacy API.
   *
   * <p>The legacy API returns a paged JSON structure; this method converts the content field into a
   * {@link Page} of {@link MyForestClientSearchResultDto}.
   * </p>
   *
   * @param values   the set of client values to search for
   * @param pageable pageable information to include in the request
   * @return a {@link Page} of {@link MyForestClientSearchResultDto}
   */
  public Page<MyForestClientSearchResultDto> searchMyClients(
      Set<String> values,
      Pageable pageable
  ) {
    return myForestClientClient.searchMyClients(values, pageable);
  }

}
