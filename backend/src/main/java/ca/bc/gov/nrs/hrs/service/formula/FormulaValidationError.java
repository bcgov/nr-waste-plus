package ca.bc.gov.nrs.hrs.service.formula;

import java.io.Serializable;

/** A structured formula diagnostic suitable for Monaco's marker model. */
public record FormulaValidationError(
    Code code,
    String message,
    int startOffset,
    int endOffset) implements Serializable {

  private static final long serialVersionUID = 1L;

  /** Stable diagnostic taxonomy exposed to clients. */
  public enum Code {
    SYNTAX_ERROR,
    UNKNOWN_VARIABLE,
    CYCLE_DETECTED,
    UNSUPPORTED_FUNCTION,
    EXCESSIVE_COMPLEXITY,
    DIVISION_BY_ZERO,
    TYPE_ERROR
  }
}
