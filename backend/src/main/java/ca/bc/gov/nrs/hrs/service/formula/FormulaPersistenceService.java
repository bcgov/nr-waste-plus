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

/** Preserves the legacy formula persistence contract used by district-volume workflows. */
@Service
@RequiredArgsConstructor
public class FormulaPersistenceService {
  private final DistrictVolumeFormulaRepository formulaRepository;
  private final DistrictVolumeRepository districtVolumeRepository;

  /** Returns identity-free formulas carried forward from the preceding version. */
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

  /** Persists validated legacy rows for an editable district-volume version. */
  @Transactional
  public List<DistrictVolumeFormulaEntity> saveValidated(Long districtVolumeId,
      List<FormulaDraft> drafts) {
    Objects.requireNonNull(districtVolumeId, "districtVolumeId");
    Objects.requireNonNull(drafts, "drafts");
    DistrictVolumeEntity volume = districtVolumeRepository
        .findByIdAndConfigType(districtVolumeId, ConfigType.DISTRICT_VOLUME)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
            "District volume record not found: " + districtVolumeId));
    LocalDate today = LocalDate.now();
    if (!volume.isDeleted() && volume.getStartDate() != null
        && !volume.getStartDate().isAfter(today)
        && (volume.getEndDate() == null || !volume.getEndDate().isBefore(today))) {
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
          "Active formula configuration is read-only.");
    }
    if (drafts.stream().anyMatch(draft -> !draft.validationErrors().isEmpty())) {
      throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
          "Formula validation errors must be resolved before saving.");
    }
    List<DistrictVolumeFormulaEntity> entities = drafts.stream().map(draft -> {
      DistrictVolumeFormulaEntity formula = new DistrictVolumeFormulaEntity();
      formula.setDistrictVolume(volume);
      formula.setFormulaKey(draft.formulaKey());
      formula.setExpression(draft.expression());
      formula.setDeclaredVariables(draft.declaredVariables());
      formula.setValidationErrors(draft.validationErrors());
      formula.setSortOrder(draft.sortOrder());
      return formula;
    }).toList();
    return formulaRepository.saveAll(entities);
  }

  /** Identity-free formula input used by the existing district-volume workflow. */
  public record FormulaDraft(String formulaKey, String expression, JsonNode declaredVariables,
      JsonNode validationErrors, int sortOrder) {
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
