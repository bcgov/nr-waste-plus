package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.exception.InvalidSelectedValueException;
import ca.bc.gov.nrs.hrs.service.SearchService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.HashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller exposing search-related REST endpoints for reporting units.
 *
 * <p>Provides endpoints to search reporting units with filtering and paging,
 * and to search for users associated with reporting units. The controller consults the caller's JWT
 * to apply identity-provider-specific validation and scoping rules (for example to restrict BCEID
 * callers to their assigned clients).
 * </p>
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
@Observed
public class SearchController {

  private final SearchService service;

  /**
   * Search for reporting units (waste entries) using the provided filters and pageable
   * information.
   *
   * <p>For callers authenticated via BCeID (IdentityProvider.BUSINESS_BCEID), an
   * additional validation is applied: if the {@code clientNumber} filter is specified it must be
   * present in the caller's client roles. If not, an {@link InvalidSelectedValueException} is
   * thrown.
   * </p>
   *
   * <p>NOTE: The existing inline comment {@code #128} that mentions BCeID
   * behaviour is preserved here because the size adjustment and client-side filtering are
   * implemented where appropriate in other endpoints.
   * </p>
   *
   * @param jwt      the JWT principal for the authenticated caller
   * @param filters  the search filters (mapped from request parameters)
   * @param pageable pageable information (page, size, sort)
   * @return a page of {@link ReportingUnitSearchResultDto} matching the provided filters
   * @throws InvalidSelectedValueException when a BCEID caller specifies a client number that is not
   *                                       present in their assigned client roles
   */
  @GetMapping("/reporting-units")
  public Page<ReportingUnitSearchResultDto> searchWasteEntries(
      @AuthenticationPrincipal Jwt jwt,
      @ModelAttribute ReportingUnitSearchParametersDto filters,
      @PageableDefault(sort = "lastUpdated", direction = Direction.DESC)
      Pageable pageable
  ) {
    // #128: BCeID should filter out on client side, we increase the size to get more results.
    if (IdentityProvider.BUSINESS_BCEID.equals(JwtPrincipalUtil.getIdentityProvider(jwt))
        && (
            !CollectionUtils.isEmpty(filters.getClientNumbers())
            && !new HashSet<>(JwtPrincipalUtil.getClientFromRoles(jwt))
                .containsAll(filters.getClientNumbers())
        )) {
      throw new InvalidSelectedValueException(
          "Selected client number " + filters.getClientNumbers() + " is not valid");
    }

    log.info("Searching waste entries with filters: {}, pageable: {}", filters, pageable);
    return service.search(filters, pageable);

  }

  /**
   * Get the expanded search entry for a specific reporting unit and block.
   *
   * @param jwt             the JWT principal for the authenticated caller
   * @param reportingUnitId the reporting unit ID
   * @param blockId         the block ID
   * @return the expanded search entry as a {@link ReportingUnitSearchExpandedDto}
   */
  @GetMapping("/reporting-units/ex/{reportingUnitId}/{blockId}")
  public ReportingUnitSearchExpandedDto getSearchExpandedEntry(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId
  ) {
    log.info("Fetching expanded search entry for reporting unit ID: {} for: {}",
        reportingUnitId, JwtPrincipalUtil.getUserId(jwt)
    );

    return service.getSearchExpanded(reportingUnitId, blockId);
  }

  /**
   * Search for reporting unit users by a partial or full user id.
   *
   * @param userId the user id to search for
   * @return a list of user ids that match the provided value
   */
  @GetMapping("/reporting-units-users")
  public List<String> searchReportingUnitUsers(
      @RequestParam String userId
  ) {
    log.info("Searching for users that matches {}", userId);
    return service.searchReportingUnitUser(userId);
  }

}
