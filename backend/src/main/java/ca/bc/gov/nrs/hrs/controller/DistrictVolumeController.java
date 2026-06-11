package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.service.DistrictVolumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/configuration/district-average-volumes")
@RequiredArgsConstructor
public class DistrictVolumeController {

  private final DistrictVolumeService districtVolumeService;

  @GetMapping
  public ResponseEntity<Page<DistrictVolumeListItemDto>> getDistrictVolumes(
      @PageableDefault(size = 10) Pageable pageable) {

    Page<DistrictVolumeListItemDto> volumes =
        districtVolumeService.getDistrictVolumes(pageable);

    return ResponseEntity.ok(volumes);
  }

  @GetMapping("/{id}")
  public ResponseEntity<DistrictVolumeDetailDto> getDistrictVolumeById(
      @PathVariable Long id) {

    DistrictVolumeDetailDto volumeDetail =
        districtVolumeService.getDistrictVolumeById(id);

    return ResponseEntity.ok(volumeDetail);
  }
}