package ca.bc.gov.nrs.hrs.service.formula;

/**
 * Thrown when formula parsing or evaluation fails.
 */
public class FormulaEvaluationException extends RuntimeException {

  public FormulaEvaluationException(String message) {
    super(message);
  }
}
