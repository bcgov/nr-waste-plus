package ca.bc.gov.nrs.hrs.controller;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetRequest;
import ca.bc.gov.nrs.hrs.dto.formula.FormulaSetResponse;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.service.formula.FormulaSetService;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** REST API for independent date-effective formula sets. */
@RestController
@RequestMapping("/api/configuration/formulas")
@RequiredArgsConstructor
public class FormulaSetController {
  private final FormulaSetService service;
  @PostMapping
  public ResponseEntity<FormulaSetResponse> create(
      @Valid @RequestBody FormulaSetRequest request) {
    FormulaSetResponse response = service.create(request);
    return ResponseEntity.created(URI.create("/api/configuration/formulas/" + response.id()))
        .body(response);
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
}
