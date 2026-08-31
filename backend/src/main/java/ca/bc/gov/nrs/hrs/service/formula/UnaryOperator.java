package ca.bc.gov.nrs.hrs.service.formula;

/** Unary operators accepted by the formula grammar. */
public enum UnaryOperator {
  PLUS("+"),
  MINUS("-");

  private final String symbol;

  UnaryOperator(String symbol) {
    this.symbol = symbol;
  }

  /** Returns the source symbol. */
  public String symbol() {
    return symbol;
  }
}
