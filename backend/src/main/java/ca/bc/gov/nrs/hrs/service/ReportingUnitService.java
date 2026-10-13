package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.dto.search.ReportingUnitSearchParametersDto;
import ca.bc.gov.nrs.hrs.entity.block.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.ForestClientNotFoundException;
import ca.bc.gov.nrs.hrs.provider.forestclient.ForestClientApiProvider;
import ca.bc.gov.nrs.hrs.provider.legacy.LegacyApiProvider;
import ca.bc.gov.nrs.hrs.repository.block.ReportingUnitRepository;
import io.micrometer.observation.annotation.Observed;
import io.micrometer.tracing.annotation.NewSpan;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service responsible for retrieving and enriching Reporting Unit details.
 *
 * <p>Fetches raw data from the legacy API and enriches it with client information from the Forest
 * Client API, combining both into a unified {@link ReportingUnitDetailsDto} response. Handles
 * creation of new reporting units with comprehensive validation.
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class ReportingUnitService {

  private static final CodeDescriptionDto DISTRICT_AVERAGE_SAMPLING =
      new CodeDescriptionDto("AVG", "Average");

  private final LegacyApiProvider legacyApiProvider;
  private final ForestClientApiProvider forestClientApiProvider;
  private final DistrictVolumeService districtVolumeService;
  private final CodesService codesService;
  private final ReportingUnitRepository reportingUnitRepository;

  /**
   * Retrieves and enriches the full details of a reporting unit.
   *
   * <p>Uses PostgreSQL details for locally-owned reporting units and falls back to the legacy API
   * for reporting units not present in PostgreSQL.
   *
   * @param reportingUnitId the unique identifier of the reporting unit to retrieve (must not be
   *     null)
   * @return a fully populated {@link ReportingUnitDetailsDto} combining legacy and Forest Client
   *     API data; never null
   * @throws ForestClientNotFoundException if no Forest Client record can be found for the client
   *     number returned by the legacy API
   */
  @NewSpan
  public ReportingUnitDetailsDto getReportingUnitDetails(Long reportingUnitId) {

    log.info("Fetching reporting unit details for RU {}", reportingUnitId);

    return getPostgresReportingUnitDetails(reportingUnitId)
        .orElseGet(() -> getLegacyReportingUnitDetails(reportingUnitId));
  }

  private Optional<ReportingUnitDetailsDto> getPostgresReportingUnitDetails(Long reportingUnitId) {
    return reportingUnitRepository
        .findByIdAndDeletedFalse(reportingUnitId)
        .map(reportingUnit -> buildPostgresReportingUnitDetails(reportingUnitId, reportingUnit));
  }

  private ReportingUnitDetailsDto buildPostgresReportingUnitDetails(
      Long reportingUnitId, ReportingUnitEntity reportingUnit) {
    var district =
        codesService.getDistrictCodes().stream()
            .filter(code -> reportingUnit.getOrgUnitNo().equals(code.code()))
            .findFirst()
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "No district code found for reporting unit organizational unit "
                            + reportingUnit.getOrgUnitNo()));
    var clientInformation =
        forestClientApiProvider
            .fetchClientByNumber(reportingUnit.getClientNumber())
            .orElseThrow(
                () -> new ForestClientNotFoundException(reportingUnit.getClientNumber()));
    var districtAreas = districtVolumeService.getAreasForDistrictCode(district.code());
    var grade =
        districtAreas.size() == 1
            ? new CodeDescriptionDto(districtAreas.getFirst(), districtAreas.getFirst())
            : new CodeDescriptionDto(null, null);

    return new ReportingUnitDetailsDto(
        reportingUnitId,
        new CodeDescriptionDto(clientInformation.clientNumber(), clientInformation.name()),
        new CodeDescriptionDto(
            clientInformation.clientStatusCode().getCode(),
            clientInformation.clientStatusCode().getDescription()),
        DISTRICT_AVERAGE_SAMPLING,
        new CodeDescriptionDto(district.code(), district.description()),
        grade);
  }

  private ReportingUnitDetailsDto getLegacyReportingUnitDetails(Long reportingUnitId) {
    var legacyClient = legacyApiProvider.getReportingUnitDetails(reportingUnitId);

    var clientInformation =
        forestClientApiProvider
            .fetchClientByNumber(legacyClient.clientNumber())
            .orElseThrow(() -> new ForestClientNotFoundException(legacyClient.clientNumber()));

    var districtAreas =
        districtVolumeService.getAreasForDistrictCode(legacyClient.district().code());
    var grade =
        districtAreas.size() == 1
            ? new CodeDescriptionDto(districtAreas.getFirst(), districtAreas.getFirst())
            : new CodeDescriptionDto(null, null);

    return new ReportingUnitDetailsDto(
            reportingUnitId,
            new CodeDescriptionDto(clientInformation.clientNumber(), clientInformation.name()),
            new CodeDescriptionDto(
                clientInformation.clientStatusCode().getCode(),
                clientInformation.clientStatusCode().getDescription()),
            legacyClient.sampling(),
            legacyClient.district(),
            grade)
        .withLegacy(true);
  }

  /**
   * Creates a new reporting unit.
   *
   * <p>Performs the following validations and actions:
   *
   * <ul>
   *   <li>Validates that only the {@code AVG} sampling code is supported.
   *   <li>Checks that a reporting unit with the same client number and district does not already
   *       exist.
   *   <li>Validates that a grade code is provided when the district has multiple configured areas.
   *   <li>Verifies that the client exists in the Forest Client API.
   *   <li>Creates the reporting unit through the legacy API.
   * </ul>
   *
   * @param request the validated create request containing client, district, sampling, and optional
   *     grade information
   * @return the ID of the newly created reporting unit
   * @throws ForestClientNotFoundException if the client does not exist in the Forest Client API
   * @throws ResponseStatusException with HTTP 400 if the sampling code is invalid, a grade code is
   *     required but missing, or any required validation fails
   * @throws ResponseStatusException with HTTP 409 if a duplicate reporting unit already exists for
   *     the same client number and district
   */
  @NewSpan
  public Long createReportingUnit(@Valid CreateReportingUnitRequestDto request) {

    log.info("Creating reporting unit for client {}", request.clientNumber());

    if (!"AVG".equals(request.samplingCode())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Invalid samplingCode: " + request.samplingCode() + " (only AVG is currently supported)");
    }

    // Check for existing reporting unit with the same client number and district
    var searchFilters =
        ReportingUnitSearchParametersDto.builder()
            .clientNumbers(List.of(request.clientNumber()))
            .district(List.of(request.districtCode()))
            .build();

    var existing = legacyApiProvider.searchReportingUnit(searchFilters, PageRequest.of(0, 1));

    if (existing != null && existing.getTotalElements() > 0) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          String.format(
              "Reporting unit for client %s and district %s already exists!",
              request.clientNumber(), request.districtCode()));
    }

    var districtAreas = districtVolumeService.getAreasForDistrictCode(request.districtCode());

    if (districtAreas.size() > 1 && StringUtils.isBlank(request.gradeCode())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          String.format("Grade code is required for district %s", request.districtCode()));
    }

    // Validate client exists via Forest Client API
    forestClientApiProvider
        .fetchClientByNumber(request.clientNumber())
        .orElseThrow(() -> new ForestClientNotFoundException(request.clientNumber()));

    // Create reporting unit via legacy API
    Long createdId = legacyApiProvider.createReportingUnit(request);

    return createdId;
  }
}
