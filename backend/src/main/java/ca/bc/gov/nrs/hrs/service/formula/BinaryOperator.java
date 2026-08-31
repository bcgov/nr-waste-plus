package ca.bc.gov.nrs.hrs.service.formula;

/** Operators accepted by the formula grammar. */
public enum BinaryOperator {
  ADD("+", 10),
  SUBTRACT("-", 10),
  MULTIPLY("*", 20),
  DIVIDE("/", 20),
  LESS_THAN("<", 5),
  LESS_THAN_OR_EQUAL("<=", 5),
  GREATER_THAN(">", 5),
  GREATER_THAN_OR_EQUAL(">=", 5),
  EQUAL("==", 5),
  NOT_EQUAL("!=", 5);

  private final String symbol;
  private final int precedence;

  BinaryOperator(String symbol, int precedence) {
    this.symbol = symbol;
    this.precedence = precedence;
  }

  /** Returns the source symbol. */
  public String symbol() {
    return symbol;
  }

  /** Returns precedence used by the parser. */
  public int precedence() {
    return precedence;
  }

  /** Returns whether this operator produces a boolean expression. */
  public boolean isComparison() {
    return precedence == 5;
  }
}
