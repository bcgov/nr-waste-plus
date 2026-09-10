package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaItemDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.DistrictVolumeFormulaEntity;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;

/**
 * Shared entity-mapping logic for formula rows.
 *
 * <p>Eliminates duplicated field-setting boilerplate between
 * {@link FormulaSetService} and {@link FormulaPersistenceService}.
 */
final class FormulaRowMapper {

  private FormulaRowMapper() {}

  /** Maps a DTO to a new row entity for an independent formula set. */
  static FormulaSetRowEntity toSetRow(Long formulaSetId, FormulaItemDto item) {
    FormulaSetRowEntity row = new FormulaSetRowEntity();
    row.setFormulaSetId(formulaSetId);
    row.setFormulaKey(item.formulaKey());
    row.setExpression(item.expression());
    row.setSortOrder(item.sortOrder());
    row.setDeclaredVariables(JsonNodeFactory.instance.objectNode());
    row.setValidationErrors(JsonNodeFactory.instance.arrayNode());
    return row;
  }

  /** Maps a draft to a new formula entity for a district-volume version. */
  static DistrictVolumeFormulaEntity toLegacyRow(DistrictVolumeEntity volume,
      FormulaPersistenceService.FormulaDraft draft) {
    DistrictVolumeFormulaEntity formula = new DistrictVolumeFormulaEntity();
    formula.setDistrictVolume(volume);
    formula.setFormulaKey(draft.formulaKey());
    formula.setExpression(draft.expression());
    formula.setDeclaredVariables(draft.declaredVariables());
    formula.setValidationErrors(draft.validationErrors());
    formula.setSortOrder(draft.sortOrder());
    return formula;
  }
}
