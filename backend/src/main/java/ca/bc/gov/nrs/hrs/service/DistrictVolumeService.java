package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.TableData;
import ca.bc.gov.nrs.hrs.mapper.DistrictVolumeMapper;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import io.micrometer.tracing.annotation.NewSpan;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.EnumUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service for managing district volume configurations.
 *
 * <p>Handles retrieval, creation, and validation of district volume records. Supports filtering
 * by geographic area (INTERIOR, COASTAL) and provides methods to determine which areas have
 * active configurations for a given district code.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DistrictVolumeService {

  private final DistrictVolumeRepository districtVolumeRepository;

  /**
   * Retrieves a paginated list of district volume records.
   *
   * <p>Optionally filters results by geographic area. If no area filter is provided, returns all
   * district volume records.</p>
   *
   * @param areaOptional optional area filter (INTERIOR or COASTAL); if empty, no filtering is
   *     applied
   * @param pageable pagination parameters
   * @return a page of {@link DistrictVolumeListItemDto} matching the filter criteria
   */
  @Transactional(readOnly = true)
  @NewSpan
  public Page<DistrictVolumeListItemDto> getDistrictVolumes(
      Optional<String> areaOptional,
      Pageable pageable) {

    log.debug("Listing existing district volumes with area filter: {} and page: {}",
        areaOptional.orElse("None"), pageable);

    Page<DistrictVolumeEntity> entities =
        areaOptional
            .map(areaStr -> {
              Area areaEnum = Area.valueOf(areaStr.toUpperCase());
              return districtVolumeRepository.findByArea(
                  areaEnum,
                  pageable);
            })
            .orElseGet(() -> districtVolumeRepository.findAll(pageable));

    return entities.map(DistrictVolumeMapper::toListItemDto);
  }

  /**
   * Retrieves a single district volume record by its ID.
   *
   * @param id the unique identifier of the district volume record
   * @return the {@link DistrictVolumeDetailDto} for the specified ID
   * @throws ResponseStatusException with HTTP 404 if the record is not found
   */
  @Transactional(readOnly = true)
  public DistrictVolumeDetailDto getDistrictVolumeById(Long id) {

    DistrictVolumeEntity entity =
        districtVolumeRepository.findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "District volume record not found"));

    return DistrictVolumeMapper.toDetailDto(entity);
  }

  /**
   * Returns the geographic areas that currently have active district-volume data for a district.
   *
   * <p>Checks both INTERIOR and COASTAL areas to determine which ones have active (non-expired)
   * configurations containing the specified district code.</p>
   *
   * @param districtCode the district code to search for (e.g., "DND", "DKM")
   * @return list of area names (INTERIOR, COASTAL) that have active data for the district; empty
   *     list if no areas are found or if districtCode is blank
   */
  @Transactional(readOnly = true)
  @NewSpan
  public List<String> getAreasForDistrictCode(String districtCode) {
    if (StringUtils.isBlank(districtCode)) {
      return List.of();
    }

    List<String> matchedAreas = new ArrayList<>();
    LocalDate currentDate = LocalDate.now();

    for (Area area : List.of(Area.INTERIOR, Area.COASTAL)) {
      districtVolumeRepository.findActiveByArea(area, currentDate)
          .filter(entity -> containsDistrict(entity.getTableData(), districtCode))
          .ifPresent(_ -> matchedAreas.add(area.name()));
    }

    return matchedAreas;
  }

  /**
   * Returns the geographic areas for multiple district codes in a single pass.
   *
   * <p>Fetches the active INTERIOR and COASTAL configurations once and checks all district codes
   * against both, avoiding the N+1 query pattern that would result from calling
   * {@link #getAreasForDistrictCode(String)} in a loop.</p>
   *
   * @param districtCodes the district codes to look up (null or empty returns an empty map)
   * @return map of district code to its list of area names (INTERIOR, COASTAL); each list is empty
   *     if the district was not found in any active configuration
   */
  @Transactional(readOnly = true)
  @NewSpan
  public Map<String, List<String>> getAreasForMultipleDistricts(List<String> districtCodes) {
    if (districtCodes == null || districtCodes.isEmpty()) {
      return Map.of();
    }

    Map<String, List<String>> result = new HashMap<>();
    for (String code : districtCodes) {
      result.put(code, new ArrayList<>());
    }

    LocalDate currentDate = LocalDate.now();

    for (Area area : List.of(Area.INTERIOR, Area.COASTAL)) {
      districtVolumeRepository.findActiveByArea(area, currentDate)
          .ifPresent(entity -> {
            for (String districtCode : districtCodes) {
              if (containsDistrict(entity.getTableData(), districtCode)) {
                result.get(districtCode).add(area.name());
              }
            }
          });
    }

    return result;
  }

  /**
   * Creates a new district volume configuration record.
   *
   * <p>Performs comprehensive validation including:
   * <ul>
   *   <li>Area enum validation</li>
   *   <li>Payload structure consistency with the specified area</li>
   *   <li>Helicopter multiplier requirement for COASTAL area</li>
   *   <li>Start date must be strictly after today</li>
   *   <li>No duplicate open-ended records for the area</li>
   *   <li>Start date must be after the most recent existing start date</li>
   * </ul>
   * If a previous open-ended record exists, its end date is set to one day before the new start
   * date.
   *
   * @param user the user creating the record (for audit trail)
   * @param createDto the district volume configuration payload
   * @return the newly created {@link DistrictVolumeDetailDto}
   * @throws ResponseStatusException with HTTP 400 if validation fails (invalid area, missing
   *     helicopter multiplier, invalid start date, payload mismatch)
   * @throws ResponseStatusException with HTTP 409 if multiple open-ended records exist for the
   *     area
   * @throws ResponseStatusException with HTTP 422 if start date is not strictly after today or
   *     after the most recent existing start date
   */
  @Transactional(isolation = Isolation.SERIALIZABLE)
  public DistrictVolumeDetailDto createDistrictVolume(
      String user, DistrictVolumeCreateDto createDto) {

    Area areaEnum = EnumUtils.getEnumIgnoreCase(
        Area.class,
        createDto.area());

    if (areaEnum == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Invalid area: " + createDto.area()
              + ". Must be INTERIOR or COASTAL.");
    }

    validateAreaPayloadConsistency(areaEnum, createDto);

    if (areaEnum == Area.COASTAL && createDto.heliMultiplier() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Missing helicopter multiplier configuration required when area is COASTAL.");
    }

    if (!createDto.startDate().isAfter(LocalDate.now())) {
      throw new ResponseStatusException(
          HttpStatus.UNPROCESSABLE_CONTENT,
          "Start date must be strictly after today.");
    }

    List<DistrictVolumeEntity> openEntries =
        districtVolumeRepository
            .findByAreaAndEndDateIsNullOrderByStartDateDesc(areaEnum);

    if (openEntries.size() > 1) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Data integrity issue: multiple open-ended district volume records exist for area "
              + areaEnum + ". Resolve the duplicates before creating a new configuration.");
    }

    if (!openEntries.isEmpty()) {
      DistrictVolumeEntity previousEntry = openEntries.getFirst();

      if (!createDto.startDate().isAfter(previousEntry.getStartDate())) {
        throw new ResponseStatusException(
            HttpStatus.UNPROCESSABLE_CONTENT,
            "Start date must be after the most recent existing start date ("
                + previousEntry.getStartDate() + ").");
      }

      previousEntry.setEndDate(createDto.startDate().minusDays(1));
      districtVolumeRepository.save(previousEntry);
    }

    DistrictVolumeEntity entity = new DistrictVolumeEntity();

    entity.setArea(areaEnum);
    entity.setStartDate(createDto.startDate());
    entity.setTableLevelFactor(createDto.tableLevelFactor());
    entity.setHeliMultiplier(createDto.heliMultiplier());
    entity.setCreatedBy(user);

    entity.setTableData(
        DistrictVolumeMapper.toEntityTableData(
            createDto.tableData()));

    DistrictVolumeEntity savedEntity =
        districtVolumeRepository.save(entity);

    return DistrictVolumeMapper.toDetailDto(savedEntity);
  }

  /**
   * Checks if the provided table data contains a district with the specified code.
   *
   * <p>Searches through zones or sections (depending on the table data structure) to find a
   * matching district code. Comparison is case-insensitive.</p>
   *
   * @param tableData the table data structure to search (may be null)
   * @param districtCode the district code to search for
   * @return true if the district code is found in the table data; false otherwise
   */
  private boolean containsDistrict(
      TableData tableData,
      String districtCode) {

    if (tableData == null || StringUtils.isBlank(districtCode)) {
      return false;
    }

    String normalizedCode = districtCode.toUpperCase();

    if (tableData.sections() != null) {
      boolean match = tableData.sections().stream()
          .flatMap(section ->
              section.districts() != null ? section.districts().stream()
                  : Stream.empty())
          .anyMatch(d -> normalizedCode.equals(
              d.district().code().toUpperCase()));
      if (match) {
        return true;
      }
    }

    if (tableData.zones() != null) {
      return tableData.zones().stream()
          .flatMap(zone ->
              zone.districts() != null ? zone.districts().stream() : Stream.empty())
          .anyMatch(d -> normalizedCode.equals(
              d.district().code().toUpperCase()));
    }

    return false;
  }

  /**
   * Validates that the table data payload structure matches the specified area.
   *
   * <p>Ensures that INTERIOR areas have InteriorDataDto and COASTAL areas have CoastDataDto.</p>
   *
   * @param areaEnum the geographic area (INTERIOR or COASTAL)
   * @param createDto the district volume creation request
   * @throws ResponseStatusException with HTTP 400 if the payload structure does not match the
   *     area or if the payload is null/invalid
   */
  private void validateAreaPayloadConsistency(
      Area areaEnum, DistrictVolumeCreateDto createDto) {

    switch (createDto.tableData()) {

      case InteriorDataDto _ when areaEnum != Area.INTERIOR -> throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Area mismatch: Expected INTERIOR data layout.");

      case CoastDataDto _ when areaEnum != Area.COASTAL -> throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Area mismatch: Expected COASTAL data layout.");

      case InteriorDataDto _ -> {
        // Valid structural combination; do nothing and allow processing to continue.
      }

      case CoastDataDto _ -> {
        // Valid structural combination; do nothing and allow processing to continue.
      }

      case null, default -> throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Invalid or missing table data payload structure.");
    }
  }

}