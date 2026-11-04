package ca.bc.gov.nrs.hrs.service.reportingunit;

import ca.bc.gov.nrs.hrs.LegacyConstants;
import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.CreateReportingUnitRequestDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitBlockDto;
import ca.bc.gov.nrs.hrs.dto.reportingunit.ReportingUnitDetailsDto;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitBlockProjection;
import ca.bc.gov.nrs.hrs.entity.reportingunit.ReportingUnitEntity;
import ca.bc.gov.nrs.hrs.exception.WasteReportingUnitNotFound;
import ca.bc.gov.nrs.hrs.mappers.reportingunit.ReportingUnitDetailsMapper;
import ca.bc.gov.nrs.hrs.repository.ReportingUnitRepository;
import ca.bc.gov.nrs.hrs.repository.codes.OrgUnitRepository;
import ca.bc.gov.nrs.hrs.repository.codes.SamplingOptionRepository;
import io.micrometer.observation.annotation.Observed;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
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
 * <p>Exposes a method used by {@link ca.bc.gov.nrs.hrs.controller.ReportingUnitController} to
 * return the high-level metadata of a single Reporting Unit, scoped by the caller's client numbers.
 * When no client numbers are supplied the query falls back to an unrestricted search using {@link
 * LegacyConstants#NOVALUE}.
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

  /** Status code used when a block's status cannot be resolved from the code table. */
  private static final String DEFAULT_BLOCK_STATUS_CODE = "DFT";

  /** Status name used when a block's status cannot be resolved from the code table. */
  private static final String DEFAULT_BLOCK_STATUS_NAME = "Draft";

  /**
   * Retrieves the detail view for the given Reporting Unit, scoped to the provided client numbers.
   *
   * <p>When {@code clients} is empty or {@code null}, the query is executed without client
   * restriction by substituting {@link LegacyConstants#NOVALUE}.
   *
   * <p>If no record is found for the supplied {@code reportingUnitId}, a {@link
   * WasteReportingUnitNotFound} exception is thrown.
   *
   * @param reportingUnitId the identifier of the reporting unit to retrieve
   * @param clients the list of client numbers used to scope the query; may be empty or {@code null}
   * @return the {@link ReportingUnitDetailsDto} for the requested reporting unit
   * @throws WasteReportingUnitNotFound if no reporting unit is found for the given ID and clients
   */
  public ReportingUnitDetailsDto getReportingUnitDetails(
      Long reportingUnitId, List<String> clients) {
    List<String> searchClients =
        CollectionUtils.isEmpty(clients) ? List.of(LegacyConstants.NOVALUE) : clients;

    return ruRepository
        .getReportingUnitDetails(reportingUnitId, searchClients)
        .map(ruDetailsMapper::fromProjection)
        .orElseThrow(() -> new WasteReportingUnitNotFound(reportingUnitId));
  }

  /**
   * Retrieves the block rows for the given Reporting Unit.
   *
   * <p>Nullable source columns are carried through as {@code null}. Fallbacks required by the
   * blocks contract are applied while mapping: {@code cutBlockId} defaults to an empty string
   * and a status whose code or description cannot be resolved from the code table defaults to
   * {@code DFT} / {@code Draft}.</p>
   *
   * @param reportingUnitId the identifier of the reporting unit whose blocks are requested
   * @return the list of blocks for the reporting unit, empty when none exist
   */
  public List<ReportingUnitBlockDto> getReportingUnitBlocks(Long reportingUnitId) {
    verifyReportingUnitExists(reportingUnitId);

    return ruRepository.getReportingUnitBlocks(reportingUnitId).stream()
        .map(ReportingUnitService::toBlockDto)
        .toList();
  }

  private void verifyReportingUnitExists(Long reportingUnitId) {
    if (!ruRepository.existsById(reportingUnitId)) {
      throw new WasteReportingUnitNotFound(reportingUnitId);
    }
  }

  /**
   * Maps a block projection to its response DTO, applying the blocks-contract fallbacks.
   *
   * @param projection the block projection returned by the repository
   * @return the mapped {@link ReportingUnitBlockDto}
   */
  private static ReportingUnitBlockDto toBlockDto(ReportingUnitBlockProjection projection) {
    String statusCode = projection.getStatusCode();
    String statusName = projection.getStatusName();
    CodeDescriptionDto status =
        statusCode == null
            || statusCode.isBlank()
            || statusName == null
            ? new CodeDescriptionDto(DEFAULT_BLOCK_STATUS_CODE, DEFAULT_BLOCK_STATUS_NAME)
            : new CodeDescriptionDto(statusCode, statusName);

    String cutBlockId = projection.getCutBlockId();
    String resolvedCutBlockId = cutBlockId == null || cutBlockId.isBlank() ? "" : cutBlockId;

    return new ReportingUnitBlockDto(
        projection.getId(),
        projection.getLicenseNumber(),
        projection.getCuttingPermit(),
        resolvedCutBlockId,
        projection.getTimberMark(),
        projection.getTotalWasteAreaHa(),
        projection.getTotalWasteVolumeM3(),
        projection.getSubmitter(),
        status,
        projection.getLastUpdated()
    );
  }

  /**
   * Creates a new reporting unit.
   *
   * <p>Resolves the district code to its corresponding organization unit, validates the sampling
   * code, creates a new reporting unit entity, and persists it.
   *
   * @param request the DTO containing the values for the new reporting unit
   * @param userId the identifier of the authenticated user performing the creation
   * @return the id of the newly created reporting unit
   * @throws IllegalArgumentException if no organization unit exists for the supplied district code
   * @throws ResponseStatusException if the sampling code is invalid
   */
  @Transactional
  public Long createReportingUnit(CreateReportingUnitRequestDto request, String userId) {
    return createReportingUnit(request, userId, null);
  }

  /**
   * Creates or returns the reporting unit correlated with an idempotency key.
   *
   * <p>The correlation key is stored on the reporting-unit row in the same Oracle transaction as
   * the create, so a retry after the remote commit returns the original identifier.
   *
   * @param request the DTO containing the values for the reporting unit
   * @param userId the authenticated user performing the create
   * @param idempotencyKey the retry-correlation key, or null when absent
   * @return the newly created or previously correlated reporting unit id
   */
  @Transactional
  public Long createReportingUnit(
      CreateReportingUnitRequestDto request, String userId, String idempotencyKey) {
    Long orgUnitNo = resolveOrgUnitNo(request);
    String samplingCode = request.samplingCode();

    if (idempotencyKey != null && !idempotencyKey.isBlank()) {
      var existing = ruRepository.findByIdempotencyKey(idempotencyKey.trim());
      if (existing.isPresent()) {
        ReportingUnitEntity entity = existing.orElseThrow();
        if (!Objects.equals(entity.getCreatedBy(), userId)
            || !entity.getClientNumber().equals(request.clientNumber())
            || !Objects.equals(entity.getOrgUnitNo(), orgUnitNo)
            || !entity.getWasteSamplingOptionCode().equals(request.samplingCode())) {
          throw new ResponseStatusException(
              HttpStatus.CONFLICT, "Idempotency key was already used for a different request");
        }
        return entity.getId();
      }
    }

    boolean isValidSamplingCode =
        samplingOptionRepository.findAllValid().stream()
            .anyMatch(s -> s.getId().equals(samplingCode));

    if (!isValidSamplingCode) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Invalid samplingCode: " + samplingCode);
    }

    LocalDateTime now = LocalDateTime.now();

    ReportingUnitEntity entity =
        ReportingUnitEntity.builder()
            .orgUnitNo(orgUnitNo)
            .clientNumber(request.clientNumber())
            .clientLocationCode(DEFAULT_LOCATION_CODE)
            .wasteSamplingOptionCode(samplingCode)
            .wasteDispersedCvCode(null)
            .wasteAccumulatedCvCode(null)
            .appraisalMethodCode(null)
            .createdBy(userId)
            .createdAt(now)
            .updatedBy(userId)
            .updatedAt(now)
            .revision(1L)
            .idempotencyKey(
                idempotencyKey != null && !idempotencyKey.isBlank()
                    ? idempotencyKey.trim()
                    : null)
            .build();

    ReportingUnitEntity savedEntity = ruRepository.save(entity);

    log.info(
        "Successfully created new reporting unit with id {} for client {}",
        savedEntity.getId(),
        request.clientNumber());

    return savedEntity.getId();
  }

  private Long resolveOrgUnitNo(CreateReportingUnitRequestDto request) {
    return orgUnitRepository
        .findByOrgUnitCode(request.districtCode())
        .orElseThrow(
            () -> new IllegalArgumentException(
                "No district found for code: " + request.districtCode()))
        .getOrgUnitNo();
  }
}
