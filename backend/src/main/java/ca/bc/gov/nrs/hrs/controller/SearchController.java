package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
import ca.bc.gov.nrs.hrs.exception.InvalidSelectedValueException;
import ca.bc.gov.nrs.hrs.service.SearchService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
@Observed
public class SearchController {

  private final SearchService service;

  @GetMapping("/reporting-units")
  public Page<ReportingUnitSearchResultDto> searchWasteEntries(
      @AuthenticationPrincipal Jwt jwt,
      @ModelAttribute ReportingUnitSearchParametersDto filters,
      @PageableDefault(sort = "lastUpdated", direction = Direction.DESC)
      Pageable pageable
  ) {
    // #128: BCeID should filter out on client side, we increase the size to get more results.
    if (IdentityProvider.BUSINESS_BCEID.equals(JwtPrincipalUtil.getIdentityProvider(jwt))) {
      if (StringUtils.isNotBlank(filters.getClientNumber()) && !JwtPrincipalUtil.getClientFromRoles(
          jwt).contains(filters.getClientNumber())) {
        throw new InvalidSelectedValueException(
            "Selected client number " + filters.getClientNumber() + " is not valid");
      }
    }

    log.info("Searching waste entries with filters: {}, pageable: {}", filters, pageable);
    return service.search(filters.withRequestUserId(JwtPrincipalUtil.getUserId(jwt)), pageable);

  }

  @GetMapping("/reporting-units-users")
  public List<String> searchReportingUnitUsers(
      @RequestParam String userId
  ) {
    log.info("Searching for users that matches {}", userId);
    return service.searchReportingUnitUser(userId);
  }

}
