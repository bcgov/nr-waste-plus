package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.search.ClientDistrictSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchExpandedDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.exception.BlockNotFound;
import ca.bc.gov.nrs.hrs.service.search.AdvancedSearchService;
import ca.bc.gov.nrs.hrs.service.search.ReportingUnitSearchService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller that provides search endpoints for reporting units and related data.
 *
 * <p>Endpoints support paged and filtered searches for reporting units, searching reporting unit
 * users and fetching client districts for the authenticated user's forest (my-forest-clients).
 * Security and client-scoping are handled by inspecting the authenticated JWT principal.</p>
 *
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
@Observed
public class SearchController {

  private final ReportingUnitSearchService ruSearchService;
  private final AdvancedSearchService advancedSearchService;

  /**
   * Search reporting units using the provided filters and pageable settings.
   *
   * <p>The authenticated JWT is inspected to determine client scoping for non-IDIR users. IDIR
   * users perform unrestricted searches.</p>
   *
   * @param jwt      the authenticated JWT principal
   * @param filters  the search filter parameters bound from request parameters
   * @param pageable paging and sorting information
   * @return a page of {@link ReportingUnitSearchResultDto} matching the supplied criteria
   */
  @GetMapping("/reporting-units")
  public Page<ReportingUnitSearchResultDto> searchWasteEntries(
      @AuthenticationPrincipal Jwt jwt,
      @ModelAttribute ReportingUnitSearchParametersDto filters,
      @PageableDefault(sort = "lastUpdated", direction = Direction.DESC)
      Pageable pageable
  ) {

    List<String> userClientNumbers =
        JwtPrincipalUtil.getIdentityProvider(jwt).equals(IdentityProvider.IDIR)
            ? List.of()
            : JwtPrincipalUtil.getClientFromRoles(jwt);

    log.info("Searching waste entries with filters: {}, pageable: {} for: {}",
        filters, pageable,JwtPrincipalUtil.getUserId(jwt)
    );
    return ruSearchService.search(filters, pageable, userClientNumbers);

  }

  @GetMapping("/reporting-units/ex/{reportingUnitId}/{blockId}")
  public ReportingUnitSearchExpandedDto getSearchExpandedEntry(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId,
      @PathVariable Long blockId
  ) {
    log.info("Fetching expanded search entry for reporting unit ID: {} for: {}",
        reportingUnitId, JwtPrincipalUtil.getUserId(jwt)
    );

    return ruSearchService
        .getReportingUnitBlockExpanded(reportingUnitId, blockId)
        .orElseThrow(() -> new BlockNotFound(reportingUnitId, blockId));
  }

  /**
   * Search reporting unit users that match the supplied userId fragment.
   *
   * <p>For IDIR users the search is unrestricted. For other users, client-scoping will be applied
   * using roles or a fallback NOCLIENT value when no clients are present.</p>
   *
   * @param userId the user identifier fragment to search for
   * @param jwt    the authenticated JWT principal
   * @return a list of matching user identifiers (client-specific when applicable)
   */
  @GetMapping("/reporting-units-users")
  public List<String> searchReportingUnitUsers(
      @RequestParam String userId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    log.info("Searching for reporting unit users that matches {} for {}",
        userId, JwtPrincipalUtil.getUserId(jwt)
    );

    List<String> clientsFromRoles = JwtPrincipalUtil.getClientFromRoles(jwt);
    List<String> processedClientsFromClient = clientsFromRoles.isEmpty()
        ? List.of(LegacyConstants.NOCLIENT)
        : clientsFromRoles;

    // #129 IDIR users should search unrestricted. Abstract with no roles should not search
    List<String> clients = JwtPrincipalUtil.getIdentityProvider(jwt).equals(IdentityProvider.IDIR)
        ? List.of()
        : processedClientsFromClient;

    return advancedSearchService.searchReportingUnitUsers(userId, clients);
  }

  /**
   * Search client districts for the authenticated user's forest ("my forest clients").
   *
   * <p>If the optional {@code values} list is empty, clients are derived from the authenticated
   * user's roles. Otherwise, the provided values are used as filters.</p>
   *
   * @param values   optional list of client filter values
   * @param pageable paging information
   * @param jwt      the authenticated JWT principal
   * @return a page of {@link ClientDistrictSearchResultDto} representing client districts
   */
  @GetMapping("/my-forest-clients")
  public Page<ClientDistrictSearchResultDto> searchMyClients(
      @RequestParam(required = false, defaultValue = StringUtils.EMPTY) List<String> values,
      @PageableDefault(sort = "lastUpdate", direction = Direction.DESC)
      Pageable pageable,
      @AuthenticationPrincipal Jwt jwt
  ) {

    log.info("Searching client districts with filters: {}, pageable: {} for {}",
        values, pageable, JwtPrincipalUtil.getUserId(jwt)
    );
    return advancedSearchService.searchMyClients(
        values.isEmpty()
            ? JwtPrincipalUtil.getClientFromRoles(jwt)
            : values,
        pageable
    );
  }

}
