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
import lombok.RequiredArgsConstructor;
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
  public Page<DistrictVolumeListItemDto> getDistrictVolumes(Pageable pageable) {
    return districtVolumeRepository.findAll(pageable)
        .map(DistrictVolumeMapper::toListItemDto);
  }

  /**
   * Retrieves a single district volume record by its ID.
   */
  @Transactional(readOnly = true)
  public DistrictVolumeDetailDto getDistrictVolumeById(Long id) {
    DistrictVolumeEntity entity = districtVolumeRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "District volume record not found"
        ));

    return DistrictVolumeMapper.toDetailDto(entity);
  }

  /**
   * Creates a new district volume configuration record.
   */
  @Transactional
  public DistrictVolumeDetailDto createDistrictVolume(DistrictVolumeCreateDto createDto) {

    // 1. Cross-validate Area matching with the polymorphic payload structure
    validateAreaPayloadConsistency(createDto);

    // 2. Business Rule: Effective Date must be strictly in the future
    if (!createDto.startDate().isAfter(LocalDate.now())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Start date must be strictly after today."
      );
    }

    // 3. Map DTO onto the Entity
    DistrictVolumeEntity entity = new DistrictVolumeEntity();

    entity.setArea(Area.valueOf(createDto.area().toUpperCase()));
    entity.setStartDate(createDto.startDate());
    entity.setTableLevelFactor(createDto.tableLevelFactor());
    entity.setHeliMultiplier(createDto.heliMultiplier());

    // Maps the DTO polymorphic layout onto the JSONB mapping structures
    entity.setTableData(
        DistrictVolumeMapper.toEntityTableData(createDto.tableData())
    );

    // NOTE:
    // dateOfUpload, createdAt, createdBy, updatedAt, and updatedBy
    // are intentionally left out here. The @AuditingEntityListener handles them automatically!

    // 4. Persist and return structural DTO
    DistrictVolumeEntity savedEntity = districtVolumeRepository.save(entity);
    return DistrictVolumeMapper.toDetailDto(savedEntity);
  }

  /**
   * Structural cross-check validation using updated, streamlined DTO names.
   */
  private void validateAreaPayloadConsistency(DistrictVolumeCreateDto createDto) {

    String areaStr = createDto.area().toUpperCase();

    switch (createDto.tableData()) {

      case InteriorDataDto i -> {
        if (!"INTERIOR".equals(areaStr)) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST,
              "Area mismatch: Expected INTERIOR data layout."
          );
        }
      }

      case CoastDataDto c -> {
        if (!"COASTAL".equals(areaStr)) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST,
              "Area mismatch: Expected COASTAL data layout."
          );
        }

        if (createDto.heliMultiplier() == null) {
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST,
              "Missing helicopter multiplier configuration required for Coastal tables."
          );
        }
      }
    }
  }
}