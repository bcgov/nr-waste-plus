package ca.bc.gov.nrs.hrs.service;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.CoastDataDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.InteriorDataDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.mapper.DistrictVolumeMapper;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import java.time.LocalDate;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.EnumUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DistrictVolumeService {

  private final DistrictVolumeRepository districtVolumeRepository;

  /**
   * Retrieves a paginated list of district volume records.
   */
  @Transactional(readOnly = true)
  public Page<DistrictVolumeListItemDto> getDistrictVolumes(
      Optional<String> areaOptional,
      Pageable pageable) {

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
   * Creates a new district volume configuration record.
   */
  @Transactional
  public DistrictVolumeDetailDto createDistrictVolume(
      DistrictVolumeCreateDto createDto) {

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
          HttpStatus.BAD_REQUEST,
          "Start date must be strictly after today.");
    }

    DistrictVolumeEntity entity = new DistrictVolumeEntity();

    entity.setArea(areaEnum);
    entity.setStartDate(createDto.startDate());
    entity.setTableLevelFactor(createDto.tableLevelFactor());
    entity.setHeliMultiplier(createDto.heliMultiplier());

    entity.setTableData(
        DistrictVolumeMapper.toEntityTableData(
            createDto.tableData()));

    DistrictVolumeEntity savedEntity =
        districtVolumeRepository.save(entity);

    return DistrictVolumeMapper.toDetailDto(savedEntity);
  }
  
  /**
   * Structural cross-check validation.
   */
  private void validateAreaPayloadConsistency(
      Area areaEnum, DistrictVolumeCreateDto createDto) {

    switch (createDto.tableData()) {

      case InteriorDataDto i -> {
        if (areaEnum != Area.INTERIOR) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST,
              "Area mismatch: Expected INTERIOR data layout.");
        }
      }

      case CoastDataDto c -> {
        if (areaEnum != Area.COASTAL) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST,
              "Area mismatch: Expected COASTAL data layout.");
        }
      }

      case null, default -> throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Invalid or missing table data payload structure.");
    }
  }

}