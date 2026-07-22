package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class SpeciesCompositionService {

  private final DistrictVolumeRepository districtVolumeRepository;

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
              return districtVolumeRepository.findAllByConfigTypeAndArea(
                  ConfigType.SPECIES_COMPOSITION,
                  areaEnum,
                  pageable);
            })
            .orElseGet(() -> districtVolumeRepository.findAllByConfigType(
                ConfigType.SPECIES_COMPOSITION, pageable));

    return entities.map(DistrictVolumeMapper::toListItemDto);
  }

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
  
  @Transactional
  public void deleteSpeciesComposition(Long id) {
    log.debug("Deleting species composition record for ID: {}", id);
    
    DistrictVolumeEntity entity = districtVolumeRepository
        .findByIdAndConfigType(id, ConfigType.SPECIES_COMPOSITION)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Species composition record not found for id: " + id));

    districtVolumeRepository.delete(entity);
    log.info("Successfully deleted species composition record with ID: {}", id);
  }
}