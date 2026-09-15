package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetListItemDto;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetRequest;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetResponse;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaVariablesResponse;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.service.formula.FormulaSetService;
import ca.bc.gov.nrs.hrs.service.formula.FormulaVariableService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** REST API for independent date-effective formula sets. */
@RestController
@RequestMapping("/api/configuration/formulas")
@RequiredArgsConstructor
public class FormulaSetController {
  private final FormulaSetService service;
  private final FormulaVariableService variableService;
  @PostMapping
  public ResponseEntity<FormulaSetResponse> create(
      @Valid @RequestBody FormulaSetRequest request) {
    FormulaSetResponse response = service.create(request);
    return ResponseEntity.created(URI.create("/api/configuration/formulas/" + response.id()))
        .body(response);
  }

  /** Returns the non-deleted formula sets for the administration list. */
  @GetMapping
  public ResponseEntity<Page<FormulaSetListItemDto>> list(
      @PageableDefault(size = 10)
      Pageable pageable) {
    return ResponseEntity.ok(service.list(pageable));
  }

  @GetMapping("/{id:\\d+}")
  public FormulaSetResponse getById(@PathVariable Long id) {
    return service.getById(id);
  }

  /** Retrieves the current open-ended formula set for an area. */
  @GetMapping("/current/{area}")
  public FormulaSetResponse currentOpenEnded(@PathVariable Area area) {
    return service.currentOpenEnded(area);
  }

  @PutMapping("/{id}")
  public FormulaSetResponse update(@PathVariable Long id,
      @Valid @RequestBody FormulaSetRequest request) {
    return service.update(id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{date}/{area}")
  public FormulaSetResponse effective(@PathVariable LocalDate date, @PathVariable Area area) {
    return service.effective(date, area);
  }

  /**
   * Returns available formula variables with nested, flat, and schema representations.
   *
   * @param date the effective date for variable resolution
   * @param area the geographic area (INTERIOR or COASTAL)
   * @param districtCode the district code used to resolve the single district's values
   * @return three complementary variable representations
   */
  @GetMapping("/variables")
  public FormulaVariablesResponse variables(
      @RequestParam LocalDate date,
      @RequestParam Area area,
      @RequestParam String districtCode) {
    return variableService.build(date, area, districtCode);
  }
}
