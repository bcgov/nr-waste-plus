package ca.bc.gov.nrs.hrs.endpoint;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.service.search.ReportingUnitSearchService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
@Observed
public class SearchEndpoint {

  private final ReportingUnitSearchService ruSearchService;

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

    log.info("Searching waste entries with filters: {}, pageable: {}", filters, pageable);
    return ruSearchService.search(filters, pageable, userClientNumbers);

  }

  @GetMapping("/reporting-units-users")
  public List<String> searchReportingUnitUsers(
      @RequestParam String userId,
      @AuthenticationPrincipal Jwt jwt
  ){
    log.info("Searching for reporting unit users that matches {}",userId);

    List<String> clientsFromRoles = JwtPrincipalUtil.getClientFromRoles(jwt);

    // #129 IDIR users should search unrestricted. Abstract with no roles should not search
    List<String> clients = JwtPrincipalUtil.getIdentityProvider(jwt).equals(IdentityProvider.IDIR)
        ? List.of()
        : clientsFromRoles.isEmpty() ? List.of(LegacyConstants.NOCLIENT) : clientsFromRoles;


    return ruSearchService.searchReportingUnitUsers(userId,clients);
  }

}
