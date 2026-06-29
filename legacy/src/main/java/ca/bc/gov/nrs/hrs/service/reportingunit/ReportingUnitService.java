package ca.bc.gov.nrs.hrs.service.reportingunit;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.entity.codes.SamplingOptionEntity;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.WasteReportingUnitNotFound;
import ca.bc.gov.nrs.hrs.mappers.reportingunit.ReportingUnitDetailsMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.codes.OrgUnitRepository;
import ca.bc.gov.nrs.hrs.repository.codes.SamplingOptionRepository;
import io.micrometer.observation.annotation.Observed;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service that provides detail-retrieval operations for Reporting Units.
 *
 * <p>Exposes a method used by {@link ca.bc.gov.nrs.hrs.controller.ReportingUnitController}
 * to return the high-level metadata of a single Reporting Unit, scoped by the caller's
 * client numbers. When no client numbers are supplied the query falls back to an unrestricted
 * search using {@link LegacyConstants#NOVALUE}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Observed
public class ReportingUnitService {

  private final ReportingUnitRepository ruRepository;
  private final ReportingUnitDetailsMapper ruDetailsMapper;
  private final OrgUnitRepository orgUnitRepository;
  private final SamplingOptionRepository samplingOptionRepository;
  
  private static final String DEFAULT_LOCATION_CODE = "00";

  /**
   * Retrieves the detail view for the given Reporting Unit, scoped to the
   * provided client numbers.
   *
   * <p>When {@code clients} is empty or {@code null}, the query is executed
   * without client restriction by substituting
   * {@link LegacyConstants#NOVALUE}.
   *
   * <p>If no record is found for the supplied {@code reportingUnitId}, a
   * {@link WasteReportingUnitNotFound} exception is thrown.
   *
   * @param reportingUnitId the identifier of the reporting unit to retrieve
   * @param clients the list of client numbers used to scope the query; may be
   *        empty or {@code null}
   * @return the {@link ReportingUnitDetailsDto} for the requested reporting
   *         unit
   * @throws WasteReportingUnitNotFound if no reporting unit is found for the
   *         given ID and clients
   */
  public ReportingUnitDetailsDto getReportingUnitDetails(
      Long reportingUnitId,
      List<String> clients
  ) {
    List<String> searchClients = CollectionUtils.isEmpty(clients)
        ? List.of(LegacyConstants.NOVALUE)
        : clients;

    return ruRepository
        .getReportingUnitDetails(reportingUnitId, searchClients)
        .map(ruDetailsMapper::fromProjection)
        .orElseThrow(() -> new WasteReportingUnitNotFound(reportingUnitId));
  }
  
  /**
   * Creates a new Reporting Unit by delegating to the {@code WASTE_501_REPORTING_UNIT} Oracle
   * package, which generates the ID and performs the INSERT internally.
   *
   * <p>Resolves the {@code districtCode} to its corresponding org-unit number by looking up
   * the {@link ca.bc.gov.nrs.hrs.entity.codes.OrgUnitEntity} with the matching code.</p>
   *
   * @param request the DTO carrying the fields for the new reporting unit
   * @param userId  the identifier of the authenticated user performing the creation
   * @return the ID of the newly created reporting unit
   * @throws IllegalArgumentException if no org unit is found for the supplied district code
   */
  @Transactional
  @SuppressWarnings("null")
  public Long createReportingUnit(CreateReportingUnitRequestDto request, String userId) {

    Long orgUnitNo = orgUnitRepository.findByOrgUnitCode(request.districtCode())
        .orElseThrow(() ->
            new IllegalArgumentException("No district found for code: " + request.districtCode())
        )
        .getOrgUnitNo();

    String samplingCode = request.samplingCode();
    SamplingOptionEntity samplingOption = samplingOptionRepository.findAllValid().stream()
        .filter(s -> s.getId().equals(samplingCode))
        .findFirst()
        .orElseThrow(() -> 
            new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Invalid samplingCode: " + samplingCode
        ));
    
    LocalDateTime now = LocalDateTime.now();

    ReportingUnitEntity entity = ReportingUnitEntity.builder()
        .orgUnitNo(orgUnitNo)
        .clientNumber(request.clientNumber())
        .clientLocationCode(DEFAULT_LOCATION_CODE)
        .wasteSamplingOptionCode(samplingOption.getId())
        .wasteDispersedCvCode(null)
        .wasteAccumulatedCvCode(null)
        .appraisalMethodCode(null)
        .createdBy(userId)
        .createdAt(now)
        .updatedBy(userId)
        .updatedAt(now)
        .revision(1L)
        .build();

    ReportingUnitEntity savedEntity = ruRepository.save(entity);

    log.info(
        "Successfully created new reporting unit with id {} for client {}",
        savedEntity.getId(),
        request.clientNumber()
    );

    return savedEntity.getId();
  }

}