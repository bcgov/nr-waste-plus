package ca.bc.gov.nrs.hrs.service.formula;

/** A named formula definition used by save-time validation and dependency analysis. */
public record FormulaDefinition(String formulaKey, String expression) {
  /** Validates the required definition fields. */
  public FormulaDefinition {
    if (formulaKey == null || formulaKey.isBlank()) {
      throw new IllegalArgumentException("Formula key must not be blank");
    }
    if (expression == null || expression.isBlank()) {
      throw new IllegalArgumentException("Formula expression must not be blank");
    }
  }
}
