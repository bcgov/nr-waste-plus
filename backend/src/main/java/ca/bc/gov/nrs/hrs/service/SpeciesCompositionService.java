package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.SpeciesCompositionTableDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.mapper.DistrictVolumeMapper;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.EnumUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service for managing species composition records.
 *
 * <p>Provides operations for listing, retrieving, and creating species
 * composition records, including validation and business rule enforcement.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SpeciesCompositionService {

  private final DistrictVolumeRepository districtVolumeRepository;

  /**
   * Retrieves a paginated list of species composition records, optionally
   * filtered by area.
   *
   * @param areaOptional optional area filter
   * @param pageable     pagination and sorting information
   * @return paginated list of species composition list item DTOs
   */
  @Transactional(readOnly = true)
  public Page<DistrictVolumeListItemDto> getSpeciesCompositions(
      Optional<String> areaOptional,
      Pageable pageable) {
    log.debug("Fetching species composition list, areaFilter: {}, pageable: {}",
        areaOptional.orElse("None"), pageable);

    Page<DistrictVolumeEntity> entities =
        areaOptional
            .map(areaStr -> {
              Area areaEnum = Area.valueOf(areaStr.toUpperCase());
              return districtVolumeRepository.findAllLiveByConfigTypeAndArea(
                  ConfigType.SPECIES_COMPOSITION,
                  areaEnum,
                  pageable);
            })
            .orElseGet(() -> districtVolumeRepository.findAllLiveByConfigType(
                ConfigType.SPECIES_COMPOSITION, pageable));

    return entities.map(DistrictVolumeMapper::toListItemDto);
  }

  /**
   * Retrieves a single species composition record by its ID.
   *
   * @param id the record identifier
   * @return the species composition detail DTO
   * @throws org.springframework.web.server.ResponseStatusException with
   *         {@code NOT_FOUND} if no record exists for the given ID
   */
  @Transactional(readOnly = true)
  public DistrictVolumeDetailDto getSpeciesCompositionById(Long id) {
    log.debug("Fetching species composition detail for ID: {}", id);
    DistrictVolumeEntity entity = districtVolumeRepository
        .findByIdAndConfigType(id, ConfigType.SPECIES_COMPOSITION)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Species composition record not found for id: " + id));

    return DistrictVolumeMapper.toDetailDto(entity);
  }

  /**
   * Creates a new species composition record.
   *
   * <p>Validates payload consistency with the specified area, ensures the
   * start date is in the future and chronologically after any existing
   * open-ended records, closes any currently open-ended record, and
   * persists the new entry.
   *
   * @param currentUser the authenticated user creating the record
   * @param createDto   the creation payload
   * @return the persisted species composition detail DTO
   * @throws org.springframework.web.server.ResponseStatusException with
   *         {@code BAD_REQUEST}, {@code CONFLICT}, or
   *         {@code UNPROCESSABLE_CONTENT} on validation failures
   */
  @Transactional(isolation = Isolation.SERIALIZABLE)
  public DistrictVolumeDetailDto createSpeciesComposition(
      String currentUser,
      DistrictVolumeCreateDto createDto) {
    log.debug("Creating new species composition record for area: {}", createDto.area());

    Area areaEnum = EnumUtils.getEnumIgnoreCase(
        Area.class,
        createDto.area());

    if (areaEnum == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Invalid area: " + createDto.area() + ". Must be INTERIOR or COASTAL.");
    }

    validateAreaPayloadConsistency(areaEnum, createDto);

    if (!createDto.startDate().isAfter(LocalDate.now())) {
      throw new ResponseStatusException(
          HttpStatus.UNPROCESSABLE_CONTENT,
          "Start date must be strictly after today.");
    }

    // Fetch existing open-ended rows for this configuration type and area
    List<DistrictVolumeEntity> openRows = districtVolumeRepository
        .findByConfigTypeAndAreaAndEndDateIsNullOrderByStartDateDesc(
            ConfigType.SPECIES_COMPOSITION, areaEnum);

    if (openRows.size() > 1) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Data integrity issue: multiple open-ended species composition records exist for area "
              + areaEnum + ". Resolve the duplicates before creating a new configuration.");
    }

    if (!openRows.isEmpty()) {
      DistrictVolumeEntity previousEntry = openRows.getFirst();

      if (!createDto.startDate().isAfter(previousEntry.getStartDate())) {
        throw new ResponseStatusException(
            HttpStatus.UNPROCESSABLE_CONTENT,
            "Start date must be after the most recent existing start date ("
                + previousEntry.getStartDate() + ").");
      }

      // Close the existing open-ended row
      previousEntry.setEndDate(createDto.startDate().minusDays(1));
      districtVolumeRepository.save(previousEntry);
      log.info("Closed existing open-ended species composition ID {} with end date {}",
          previousEntry.getId(), previousEntry.getEndDate());
    }

    DistrictVolumeEntity newEntity = DistrictVolumeMapper.toEntity(createDto);
    newEntity.setConfigType(ConfigType.SPECIES_COMPOSITION);
    newEntity.setCreatedBy(currentUser);

    DistrictVolumeEntity saved = districtVolumeRepository.save(newEntity);
    log.info("Successfully created species composition record with ID: {}", saved.getId());

    return DistrictVolumeMapper.toDetailDto(saved);
  }

  /**
   * Soft-deletes a species composition configuration record.
   *
   * <p>Marks the record as deleted (sets deleted = true) instead of removing it from the database.
   * This preserves audit history and allows for potential recovery.</p>
   *
   * @param user the user performing the deletion (for audit trail)
   * @param id the unique identifier of the record to delete
   * @throws ResponseStatusException with HTTP 404 if the record is not found or already deleted
   */
  @Transactional
  public void deleteSpeciesComposition(String user, Long id) {
    DistrictVolumeEntity entity = districtVolumeRepository
        .findByIdAndConfigType(id, ConfigType.SPECIES_COMPOSITION)
        .filter(e -> !e.isDeleted())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Species composition record not found: " + id));

    entity.setDeleted(true);
    districtVolumeRepository.save(entity);
    log.info("Soft-deleted species composition {} by user {}", id, user);
  }

  private void validateAreaPayloadConsistency(
      Area areaEnum, DistrictVolumeCreateDto createDto) {

    if (createDto.tableData() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Invalid or missing table data payload structure.");
    }

    if (createDto.tableData() instanceof InteriorDataDto
        && areaEnum != Area.INTERIOR) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Area mismatch: Expected INTERIOR data layout.");
    }

    if (createDto.tableData() instanceof CoastDataDto
        && areaEnum != Area.COASTAL) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Area mismatch: Expected COASTAL data layout.");
    }

    if (createDto.tableData() instanceof SpeciesCompositionTableDataDto) {
      // Species composition data is area-agnostic; valid for any area type.
    }
  }
}
