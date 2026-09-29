package ca.bc.gov.nrs.hrs.service.formula;

import ca.bc.gov.nrs.hrs.dto.formula.FormulaItemDto;
import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.FormulaSetRowEntity;

/**
 * Shared entity-mapping logic for formula rows.
 *
 * <p>Eliminates duplicated field-setting boilerplate when materializing {@link FormulaSetRowEntity}
 * rows from {@link FormulaItemDto} payloads.
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
    return row;
  }
}
