package ca.bc.gov.nrs.hrs.endpoint;

import ca.bc.gov.nrs.hrs.dto.search.ClientDistrictSearchResultDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchResultDto;
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
      @ModelAttribute ReportingUnitSearchParametersDto filters,
      @PageableDefault(sort = "lastUpdated", direction = Direction.DESC)
      Pageable pageable
  ) {

    log.info("Searching waste entries with filters: {}, pageable: {}", filters, pageable);
    return ruSearchService.search(filters, pageable);

  }

  @GetMapping("/reporting-units-users")
  public List<String> searchReportingUnitUsers(
      @RequestParam String userId,
      @AuthenticationPrincipal Jwt jwt
  ) {
    log.info("Searching for reporting unit users that matches {}", userId);
    return ruSearchService.searchReportingUnitUsers(userId,
        JwtPrincipalUtil.getClientFromRoles(jwt));
  }

  @GetMapping("/my-forest-clients")
  public Page<ClientDistrictSearchResultDto> searchMyClients(
      @RequestParam(required = false, defaultValue = StringUtils.EMPTY) List<String> values,
      @PageableDefault(sort = "lastUpdate", direction = Direction.DESC)
      Pageable pageable,
      @AuthenticationPrincipal Jwt jwt
  ) {

    log.info("Searching client districts with filters: {}, pageable: {}", values, pageable);
    return ruSearchService.searchMyClients(
        values.isEmpty()
            ? JwtPrincipalUtil.getClientFromRoles(jwt)
            : values,
        pageable
    );
  }

}
