package ca.bc.gov.nrs.hrs.service.formula;

/** Thrown when source text cannot be parsed as an approved formula. */
public final class FormulaParseException extends IllegalArgumentException {

  private final FormulaValidationError error;

  /** Creates a parse exception containing its Monaco-compatible diagnostic. */
  public FormulaParseException(FormulaValidationError error) {
    super(error.message());
    this.error = error;
  }

  /** Returns the structured parse diagnostic. */
  public FormulaValidationError error() {
    return error;
  }
}
