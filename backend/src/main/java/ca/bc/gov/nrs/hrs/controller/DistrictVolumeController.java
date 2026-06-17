package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.service.DistrictVolumeService;
import io.micrometer.observation.annotation.Observed;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller for managing district average volume configurations.
 */
@RestController
@RequestMapping("/api/configuration/district-average-volumes")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class DistrictVolumeController {

  private final DistrictVolumeService districtVolumeService;

  /**
   * Retrieves a paginated list of district volume configurations.
   *
   * @param area optional area filter (must be INTERIOR or COASTAL)
   * @param pageable pagination and sorting information
   * @return page of district volume list items
   */
  @GetMapping
  public ResponseEntity<Page<DistrictVolumeListItemDto>> getDistrictVolumes(
      @RequestParam(required = false) String area,
      @PageableDefault(size = 10) Pageable pageable) {

    if (area != null && !area.equalsIgnoreCase("INTERIOR") && !area.equalsIgnoreCase("COASTAL")) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, 
          "Invalid area parameter. Must be INTERIOR or COASTAL."
      );
    }

    Page<DistrictVolumeListItemDto> volumes =
        districtVolumeService.getDistrictVolumes(Optional.ofNullable(area), pageable);

    return ResponseEntity.ok(volumes);
  }

  /**
   * Retrieves the details of a district volume configuration.
   *
   * @param id district volume configuration identifier
   * @return detailed district volume configuration
   */
  @GetMapping("/{id}")
  public ResponseEntity<DistrictVolumeDetailDto> getDistrictVolumeById(
      @PathVariable Long id) {

    DistrictVolumeDetailDto volumeDetail =
        districtVolumeService.getDistrictVolumeById(id);

    return ResponseEntity.ok(volumeDetail);
  }
  
  /**
   * Creates a new district volume.
   *
   * <p>Creates a district volume using the provided request payload and returns a
   * {@code 201 Created} response with the URI of the newly created resource in
   * the {@code Location} header.
   *
   * @param request the district volume information to create
   * @return a {@link ResponseEntity} with status {@code 201 Created} and the
   *         location of the created district volume
   */
  @PostMapping
  @Observed
  public ResponseEntity<Void> createDistrictVolume(
      @Valid @RequestBody DistrictVolumeCreateDto request
  ) {
    DistrictVolumeDetailDto createdVolume =
        districtVolumeService.createDistrictVolume(request);

    URI location =
        URI.create("/api/configuration/district-average-volumes/" + createdVolume.id());

    return ResponseEntity.created(location).build();
  }

}