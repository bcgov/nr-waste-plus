package ca.bc.gov.nrs.hrs.service.formula;

import java.util.List;
import java.util.Objects;

/** Stable save-time validation facade for future formula persistence endpoints. */
public final class FormulaValidationService {
  private final FormulaValidator validator;

  /** Creates the facade with explicit resource limits. */
  public FormulaValidationService(FormulaParser.Options options) {
    validator = new FormulaValidator(Objects.requireNonNull(options, "options"));
  }

  /** Returns all validation diagnostics; an empty list means the payload is saveable. */
  public List<FormulaValidationError> validateForSave(FormulaValidationRequest request) {
    return validator.validate(Objects.requireNonNull(request, "request"));
  }
}
