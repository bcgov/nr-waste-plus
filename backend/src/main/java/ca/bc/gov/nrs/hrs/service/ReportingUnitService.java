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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service responsible for retrieving and enriching Reporting Unit details.
 *
 * <p>Fetches raw data from the legacy API and enriches it with client information from the Forest
 * Client API, combining both into a unified {@link ReportingUnitDetailsDto} response. Handles
 * creation of new reporting units with comprehensive validation and persists them locally to PostgreSQL.
 */
@Slf4j
@Service
@Observed
@RequiredArgsConstructor
public class ReportingUnitService {

  private final LegacyApiProvider legacyApiProvider;
  private final ForestClientApiProvider forestClientApiProvider;
  private final DistrictVolumeService districtVolumeService;
  private final ReportingUnitRepository reportingUnitRepository;
  private final CodesService codesService;

  /**
   * Retrieves and enriches the full details of a reporting unit.
   *
   * <p>Fetches the reporting unit's legacy data (client number, sampling, district) from the legacy
   * API and enriches it with the client name and status from the Forest Client API. Determines the
   * grade based on the number of configured areas for the district. For PostgreSQL-backed reporting
   * units, populates sampling method from the locally persisted sampling code.
   *
   * @param reportingUnitId the unique identifier of the reporting unit to retrieve (must not be
   *     null)
   * @return a fully populated {@link ReportingUnitDetailsDto} combining legacy, Forest Client API,
   *     and local PostgreSQL data; never null
   * @throws ForestClientNotFoundException if no Forest Client record can be found for the client
   *     number returned by the legacy API
   */
  @NewSpan
  public ReportingUnitDetailsDto getReportingUnitDetails(Long reportingUnitId) {

    log.info("Fetching reporting unit details for RU {}", reportingUnitId);

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

    CodeDescriptionDto sampling = legacyClient.sampling();
    var localReportingUnit = reportingUnitRepository.findByIdAndDeletedFalse(reportingUnitId);
    if (localReportingUnit.isPresent() && localReportingUnit.get().getSamplingCode() != null) {
      sampling = resolveSampling(localReportingUnit.get().getSamplingCode());
    }

    return new ReportingUnitDetailsDto(
        reportingUnitId,
        new CodeDescriptionDto(clientInformation.clientNumber(), clientInformation.name()),
        new CodeDescriptionDto(
            clientInformation.clientStatusCode().getCode(),
            clientInformation.clientStatusCode().getDescription()),
        sampling,
        legacyClient.district(),
        grade);
  }

  /**
   * Resolves the sampling method description for a given sampling code.
   *
   * @param samplingCode the sampling option code to resolve
   * @return a populated {@link CodeDescriptionDto}
   */
  private CodeDescriptionDto resolveSampling(String samplingCode) {
    if (StringUtils.isBlank(samplingCode)) {
      return new CodeDescriptionDto(null, null);
    }
    try {
      if (codesService != null) {
        List<CodeDescriptionDto> samplingCodes = codesService.getSamplingCodes();
        if (samplingCodes != null) {
          return samplingCodes.stream()
              .filter(code -> samplingCode.equalsIgnoreCase(code.code()))
              .findFirst()
              .orElseGet(() -> defaultSamplingDto(samplingCode));
        }
      }
    } catch (Exception e) {
      log.warn(
          "Failed to resolve sampling code {} via CodesService: {}", samplingCode, e.getMessage());
    }
    return defaultSamplingDto(samplingCode);
  }

  private CodeDescriptionDto defaultSamplingDto(String samplingCode) {
    if ("AVG".equalsIgnoreCase(samplingCode)) {
      return new CodeDescriptionDto("AVG", "District Average");
    }
    return new CodeDescriptionDto(samplingCode, samplingCode);
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
   *   <li>Persists the reporting unit in PostgreSQL with matching identifier and sampling code.
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
  @Transactional
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

    // Persist reporting unit in PostgreSQL
    try {
      ReportingUnitEntity entity = new ReportingUnitEntity();
      entity.setId(createdId);
      entity.setClientNumber(request.clientNumber());
      entity.setClientLocnCode("00");
      entity.setOrgUnitNo(request.districtCode());
      entity.setSamplingCode(request.samplingCode());
      entity.setRevision(1L);
      entity.setDeleted(false);

      reportingUnitRepository.save(entity);
      log.info("Persisted local reporting unit {} in PostgreSQL", createdId);
    } catch (Exception e) {
      log.error("Failed to persist reporting unit {} to PostgreSQL", createdId, e);
      throw e;
    }

    return createdId;
  }
}
