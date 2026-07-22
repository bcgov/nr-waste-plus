package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeCreateDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeDetailDto;
import ca.bc.gov.nrs.hrs.dto.districtaveragevolume.DistrictVolumeListItemDto;
import ca.bc.gov.nrs.hrs.service.SpeciesCompositionService;
import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import io.micrometer.observation.annotation.Observed;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller for managing species composition configurations.
 */
@RestController
@RequestMapping("/api/configuration/species-compositions")
@RequiredArgsConstructor
@Slf4j
public class SpeciesCompositionController {

  private final SpeciesCompositionService speciesCompositionService;

  /**
   * Retrieves a paginated list of species composition configurations.
   *
   * @param area     optional area filter (must be INTERIOR or COASTAL)
   * @param pageable pagination and sorting information
   * @return page of species composition list items
   */
  @GetMapping
  public ResponseEntity<Page<DistrictVolumeListItemDto>> getSpeciesCompositions(
      @RequestParam(required = false) String area,
      @PageableDefault(size = 10) Pageable pageable) {

    if (area != null && !area.equalsIgnoreCase("INTERIOR") && !area.equalsIgnoreCase("COASTAL")) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Invalid area parameter. Must be INTERIOR or COASTAL."
      );
    }
    
    Page<DistrictVolumeListItemDto> configurations =
        speciesCompositionService.getSpeciesCompositions(Optional.ofNullable(area), pageable);

    return ResponseEntity.ok(configurations);
  }

  /**
   * Retrieves the details of a species composition configuration.
   *
   * @param id species composition configuration identifier
   * @return detailed species composition configuration
   */
  @GetMapping("/{id}")
  public ResponseEntity<DistrictVolumeDetailDto> getSpeciesCompositionById(
      @PathVariable Long id) {

    DistrictVolumeDetailDto detail =
        speciesCompositionService.getSpeciesCompositionById(id);

    return ResponseEntity.ok(detail);
  }

  /**
   * Creates a new species composition configuration.
   *
   * <p>Creates a species composition using the provided request payload and the
   * authenticated user and returns a {@code 201 Created} response with the URI
   * of the newly created resource in the {@code Location} header.
   *
   * @param jwt     the authenticated user's JWT
   * @param request the species composition information to create
   * @return a {@link ResponseEntity} with status {@code 201 Created} and the location of
   *     the created species composition
   */
  @PostMapping
  @Observed
  public ResponseEntity<Void> createSpeciesComposition(
      @AuthenticationPrincipal Jwt jwt,
      @Valid @RequestBody DistrictVolumeCreateDto request) {

    DistrictVolumeDetailDto createdConfig =
        speciesCompositionService.createSpeciesComposition(
            JwtPrincipalUtil.getUserId(jwt),
            request);

    URI location =
        URI.create(
            "/api/configuration/species-compositions/"
                + createdConfig.id());

    return ResponseEntity.created(location).build();
  }
}