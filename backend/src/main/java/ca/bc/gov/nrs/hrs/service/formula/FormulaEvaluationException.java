package ca.bc.gov.nrs.hrs.service.formula;

/** Domain failure during formula evaluation (missing data, type errors, division by zero). */
public final class FormulaEvaluationException extends RuntimeException {

  FormulaEvaluationException(String message) {
    super(message);
  }

  FormulaEvaluationException(String message, Throwable cause) {
    super(message, cause);
  }
}
