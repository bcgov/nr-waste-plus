package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.ConfigType;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeFormulaEntity;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeFormulaRepository;
import ca.bc.gov.nrs.hrs.repository.DistrictVolumeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Owns formula drafts and the validated, atomic persistence boundary. */
@Service
@RequiredArgsConstructor
public class FormulaPersistenceService {

  private final DistrictVolumeFormulaRepository formulaRepository;
  private final DistrictVolumeRepository districtVolumeRepository;

  /** Returns an unsaved copy of formulas from the prior live version in the requested area. */
  @Transactional(readOnly = true)
  public List<FormulaDraft> carryForward(Area area, LocalDate targetStartDate) {
    Objects.requireNonNull(area, "area");
    Objects.requireNonNull(targetStartDate, "targetStartDate");
    return formulaRepository.findForPriorVersion(area, targetStartDate).stream()
        .map(formula -> new FormulaDraft(formula.getFormulaKey(), formula.getExpression(),
            formula.getDeclaredVariables(), JsonNodeFactory.instance.arrayNode(),
            formula.getSortOrder()))
        .toList();
  }

  /** Persists every formula in a validated batch, or none when diagnostics are present. */
  @Transactional
  public List<DistrictVolumeFormulaEntity> saveValidated(
      Long districtVolumeId, List<FormulaDraft> drafts) {
    Objects.requireNonNull(districtVolumeId, "districtVolumeId");
    Objects.requireNonNull(drafts, "drafts");
    DistrictVolumeEntity districtVolume = districtVolumeRepository
        .findByIdAndConfigType(districtVolumeId, ConfigType.DISTRICT_VOLUME)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "District volume record not found: " + districtVolumeId));
    if (isActive(districtVolume)) {
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
          "Active formula configuration is read-only.");
    }
    if (drafts.stream().anyMatch(draft -> !draft.validationErrors().isEmpty())) {
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
          "Formula validation errors must be resolved before saving.");
    }
    List<DistrictVolumeFormulaEntity> entities = drafts.stream().map(draft -> {
      DistrictVolumeFormulaEntity entity = new DistrictVolumeFormulaEntity();
      entity.setDistrictVolume(districtVolume);
      entity.setFormulaKey(draft.formulaKey());
      entity.setExpression(draft.expression());
      entity.setDeclaredVariables(draft.declaredVariables());
      entity.setValidationErrors(draft.validationErrors());
      entity.setSortOrder(draft.sortOrder());
      return entity;
    }).toList();
    return formulaRepository.saveAll(entities);
  }

  private boolean isActive(DistrictVolumeEntity entity) {
    LocalDate today = LocalDate.now();
    return !entity.isDeleted() && entity.getStartDate() != null
        && !entity.getStartDate().isAfter(today)
        && (entity.getEndDate() == null || !entity.getEndDate().isBefore(today));
  }

  /** The editable, deliberately identity-free representation used during formula review. */
  public record FormulaDraft(
      String formulaKey,
      String expression,
      JsonNode declaredVariables,
      JsonNode validationErrors,
      int sortOrder) {
    public FormulaDraft {
      Objects.requireNonNull(formulaKey, "formulaKey");
      Objects.requireNonNull(expression, "expression");
      Objects.requireNonNull(declaredVariables, "declaredVariables");
      Objects.requireNonNull(validationErrors, "validationErrors");
      if (formulaKey.isBlank() || expression.isBlank() || sortOrder < 0
          || !validationErrors.isArray()) {
        throw new IllegalArgumentException("Invalid formula draft");
      }
    }
  }
}
