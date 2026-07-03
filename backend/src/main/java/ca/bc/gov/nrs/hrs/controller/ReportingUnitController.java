package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.configuration.FeatureFlagsConfiguration;
import ca.bc.gov.nrs.hrs.dto.base.FeatureFlag;
import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.exception.NotFoundGenericException;
import ca.bc.gov.nrs.hrs.service.ReportingUnitService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing Reporting Unit detail endpoints.
 *
 * <p>Provides HTTP endpoints for retrieving full details of a reporting unit,
 * aggregating data from both the legacy API and the Forest Client API via
 * {@link ReportingUnitService}.
 * </p>
 *
 * <p>All endpoints in this controller are gated behind
 * {@link FeatureFlag#REPORTING_UNIT_DETAILS_ENABLED}. When the flag is disabled the
 * controller responds with HTTP 404 so the feature remains invisible to callers.</p>
 *
 * <p>POST /api/reporting-units creates a new Reporting Unit in the legacy system.
 * On success it returns HTTP 201 (Created) with a Location header pointing to the
 * created resource. Per API contract this endpoint does not return a response body.</p>
 */
@RestController
@RequestMapping("/api/reporting-units")
@RequiredArgsConstructor
@Slf4j
@Observed
public class ReportingUnitController {

  private final ReportingUnitService reportingUnitService;
  private final FeatureFlagsConfiguration featureFlagsConfiguration;

  /**
   * Retrieve the full details of a reporting unit by its identifier.
   *
   * <p>Delegates to {@link ReportingUnitService} to fetch and enrich the reporting unit
   * data. Returns a combined view including client information, status, grade, sampling,
   * and district.
   * </p>
   *
   * <p>Returns HTTP 404 when {@link FeatureFlag#REPORTING_UNIT_DETAILS_ENABLED} is
   * disabled.</p>
   *
   * <p>Validates that the authenticated user has permission to access the specified
   * reporting unit. For BCeID users, validates that the reporting unit's client
   * number matches one of the user's authorized client numbers. IDIR and BCSC
   * users bypass the client-level check.</p>
   *
   * @param jwt the JWT principal for the authenticated caller
   * @param reportingUnitId the unique identifier of the reporting unit to retrieve
   * @return a {@link ReportingUnitDetailsDto} containing the reporting unit's full details
   * @throws NotFoundGenericException when the feature flag is disabled
   * @throws ResponseStatusException when the user is not authorized to access the reporting unit
   */
  @GetMapping("/{reportingUnitId}")
  public ReportingUnitDetailsDto getReportingUnitDetails(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long reportingUnitId) {

    if (!featureFlagsConfiguration.isEnabled(FeatureFlag.REPORTING_UNIT_DETAILS_ENABLED)) {
      throw new NotFoundGenericException("reporting-unit-details");
    }

    log.info("Fetching reporting unit details for RU {}", reportingUnitId);

    ReportingUnitDetailsDto details = reportingUnitService.getReportingUnitDetails(reportingUnitId);

    // Enforce client-based authorization only for BCeID business users
    IdentityProvider idp = JwtPrincipalUtil.getIdentityProvider(jwt);
    if (IdentityProvider.BUSINESS_BCEID == idp) {
      String clientCode = details.client().code();
      List<String> userClientNumbers = JwtPrincipalUtil.getClientFromRoles(jwt);

      if (!userClientNumbers.contains(clientCode)) {
        log.warn("SECURITY: BCeID user {} attempted unauthorized access to reporting unit {}",
            JwtPrincipalUtil.getUserId(jwt), reportingUnitId);
        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "User is not authorized to access reporting unit: " + reportingUnitId);
      }
    }

    return details;
  }
  
  /**
   * Create a new Reporting Unit.
   *
   * Creates a reporting unit in the legacy system and returns HTTP 201 (Created)
   * with a Location header pointing to the frontend resource (/reporting-units/{id}).
   * Per API contract, this endpoint does not return a response body.
   *
   * @param request the create reporting unit request
   * @return ResponseEntity with HTTP 201 (Created) and Location header; response body is empty
   */
  @PostMapping
  @Observed
  public ResponseEntity<Void> createReportingUnit(
      @Valid @RequestBody CreateReportingUnitRequestDto request
  ) {
    Long createdId = reportingUnitService.createReportingUnit(request);

    URI location = URI.create("/reporting-units/" + createdId);

    return ResponseEntity.created(location).build();
  }

}
