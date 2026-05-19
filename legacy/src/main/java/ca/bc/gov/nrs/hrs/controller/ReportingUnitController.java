package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.service.reportingunit.ReportingUnitService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller that exposes Reporting Unit detail endpoints.
 *
 * <p>Provides an endpoint for fetching high-level metadata for a specific Reporting Unit,
 * scoped to the client numbers extracted from the authenticated JWT principal.
 * IDIR users perform an unrestricted lookup; other users are restricted to their
 * associated clients.</p>
 */
@RestController
@RequestMapping("/api/reporting-units")
@RequiredArgsConstructor
@Slf4j
public class ReportingUnitController {

  private final ReportingUnitService service;

  /**
   * Retrieve the details for the Reporting Unit identified by {@code reportingUnitId}.
   *
   * <p>The client list is derived from the authenticated JWT via
   * {@link JwtPrincipalUtil#getClientListFromJwt(Jwt)}. IDIR users receive an empty client list
   * which causes the service to perform an unrestricted search.</p>
   *
   * @param reportingUnitId the identifier of the reporting unit to retrieve
   * @param jwt             the authenticated JWT principal used to derive client scoping
   * @return the {@link ReportingUnitDetailsDto} for the requested reporting unit
   */
  @GetMapping("/{reportingUnitId}")
  public ReportingUnitDetailsDto getReportingUnitDetails(
      @PathVariable Long reportingUnitId,
      @AuthenticationPrincipal Jwt jwt
  ) {

    log.info("Fetching reporting unit details for RU {}", reportingUnitId);

    return service.getReportingUnitDetails(
        reportingUnitId,
        JwtPrincipalUtil.getClientListFromJwt(jwt)
    );
  }

}
