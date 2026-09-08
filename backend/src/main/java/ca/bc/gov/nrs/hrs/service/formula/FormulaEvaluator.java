package ca.bc.gov.nrs.hrs.service.formula;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Pure AST-walking evaluator for the formula language.
 *
 * <p>This class is intentionally free of Spring annotations and DI. It evaluates a parsed
 * {@link FormulaNode} against a pre-resolved variable map, producing a {@link BigDecimal} result.
 * All arithmetic uses BigDecimal semantics; intermediate results use scale&nbsp;12 and the final
 * output is rounded to scale&nbsp;3 with {@link RoundingMode#HALF_UP}.
 */
public final class FormulaEvaluator {

  /** Intermediate scale for arithmetic to avoid premature rounding. */
  private static final int INTERMEDIATE_SCALE = 12;

  /** Final output scale required by the contract. */
  private static final int OUTPUT_SCALE = 3;

  private static final BigDecimal ONE = BigDecimal.ONE;
  private static final BigDecimal ZERO = BigDecimal.ZERO;

  private FormulaEvaluator() {}

  /**
   * Evaluates the given AST against the resolved variable map.
   *
   * @param ast       the parsed formula tree
   * @param variables pre-resolved namespace-qualified variable values
   * @return the computed result rounded to 3 decimal places (HALF_UP)
   * @throws FormulaEvaluationException if a variable is missing, a type is wrong,
   *     or division by zero is encountered at runtime
   */
  public static BigDecimal evaluate(FormulaNode ast, Map<String, BigDecimal> variables) {
    return evaluateNode(ast, variables).setScale(OUTPUT_SCALE, RoundingMode.HALF_UP);
  }

  private static BigDecimal evaluateNode(FormulaNode node, Map<String, BigDecimal> variables) {
    return switch (node) {
      case LiteralNode literal -> literal.value();
      case VariableReferenceNode variable -> resolveVariable(variable, variables);
      case UnaryOperationNode unary -> evaluateUnary(unary, variables);
      case BinaryOperationNode binary -> evaluateBinary(binary, variables);
      case IfNode ifNode -> evaluateIf(ifNode, variables);
    };
  }

  private static BigDecimal resolveVariable(VariableReferenceNode variable,
      Map<String, BigDecimal> variables) {
    BigDecimal value = variables.get(variable.name());
    if (value == null) {
      throw new FormulaEvaluationException(
          "Missing variable: " + variable.name());
    }
    return value;
  }

  private static BigDecimal evaluateUnary(UnaryOperationNode unary,
      Map<String, BigDecimal> variables) {
    BigDecimal operand = evaluateNode(unary.operand(), variables);
    return switch (unary.operator()) {
      case PLUS -> operand;
      case MINUS -> operand.negate();
    };
  }

  private static BigDecimal evaluateBinary(BinaryOperationNode binary,
      Map<String, BigDecimal> variables) {
    BigDecimal left = evaluateNode(binary.left(), variables);
    BigDecimal right = evaluateNode(binary.right(), variables);
    return switch (binary.operator()) {
      case ADD -> left.add(right);
      case SUBTRACT -> left.subtract(right);
      case MULTIPLY -> left.multiply(right);
      case DIVIDE -> divide(left, right);
      case LESS_THAN -> left.compareTo(right) < 0 ? ONE : ZERO;
      case LESS_THAN_OR_EQUAL -> left.compareTo(right) <= 0 ? ONE : ZERO;
      case GREATER_THAN -> left.compareTo(right) > 0 ? ONE : ZERO;
      case GREATER_THAN_OR_EQUAL -> left.compareTo(right) >= 0 ? ONE : ZERO;
      case EQUAL -> left.compareTo(right) == 0 ? ONE : ZERO;
      case NOT_EQUAL -> left.compareTo(right) != 0 ? ONE : ZERO;
    };
  }

  private static BigDecimal divide(BigDecimal left, BigDecimal right) {
    if (right.signum() == 0) {
      throw new FormulaEvaluationException(
          "Division by zero");
    }
    return left.divide(right, INTERMEDIATE_SCALE, RoundingMode.HALF_UP);
  }

  private static BigDecimal evaluateIf(IfNode ifNode, Map<String, BigDecimal> variables) {
    BigDecimal condition = evaluateNode(ifNode.condition(), variables);
    if (condition.signum() != 0) {
      return evaluateNode(ifNode.valueIfTrue(), variables);
    }
    return evaluateNode(ifNode.valueIfFalse(), variables);
  }
}
