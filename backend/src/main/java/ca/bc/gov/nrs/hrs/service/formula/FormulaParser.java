package ca.bc.gov.nrs.hrs.service.formula;

import java.math.BigDecimal;
import java.util.Objects;

/** Bounded recursive-descent parser for the deliberately small formula language. */
public final class FormulaParser {

  /** Parser limits. Both limits are inclusive. */
  public record Options(int maximumAstDepth, int maximumExpressionLength) {
    /** Validates explicit parser limits. */
    public Options {
      if (maximumAstDepth < 1 || maximumExpressionLength < 1) {
        throw new IllegalArgumentException("Formula limits must be positive");
      }
    }
  }

  private final Options options;

  /** Creates a parser with explicit resource limits. */
  public FormulaParser(Options options) {
    this.options = Objects.requireNonNull(options, "options");
  }

  /** Parses a mathematical expression. */
  public FormulaNode parse(String source) {
    return parse(source, FormulaParseMode.MATHEMATICAL);
  }

  /** Parses an expression, optionally allowing comparisons. */
  public FormulaNode parse(String source, FormulaParseMode mode) {
    Objects.requireNonNull(source, "source");
    Objects.requireNonNull(mode, "mode");
    if (source.length() > options.maximumExpressionLength()) {
      throw error(FormulaValidationError.Code.EXCESSIVE_COMPLEXITY,
          "Formula exceeds the maximum expression length", 0, source.length());
    }
    Parser parser = new Parser(source, mode);
    FormulaNode result = parser.expression(0, mode == FormulaParseMode.CONDITIONAL);
    parser.skipWhitespace();
    if (!parser.atEnd()) {
      parser.fail(FormulaValidationError.Code.SYNTAX_ERROR, "Unexpected token");
    }
    return result;
  }

  private FormulaParseException error(FormulaValidationError.Code code, String message,
      int start, int end) {
    return new FormulaParseException(new FormulaValidationError(code, message, start, end));
  }

  private final class Parser {
    private final String source;
    private final FormulaParseMode mode;
    private int position;

    private Parser(String source, FormulaParseMode mode) {
      this.source = source;
      this.mode = mode;
    }

    private FormulaNode expression(int depth, boolean allowComparison) {
      checkDepth(depth);
      return binaryExpression(depth, 0, allowComparison);
    }

    private FormulaNode binaryExpression(int depth, int minimumPrecedence,
        boolean allowComparison) {
      FormulaNode left = unaryExpression(depth + 1);
      while (true) {
        skipWhitespace();
        BinaryOperator operator = operatorAt(position);
        if (operator == null || operator.precedence() < minimumPrecedence
            || (!allowComparison && operator.isComparison())) {
          return left;
        }
        int start = left.startOffset();
        position += operator.symbol().length();
        FormulaNode right = binaryExpression(depth + 1, operator.precedence() + 1, allowComparison);
        left = new BinaryOperationNode(left, operator, right, start, right.endOffset());
        checkDepth(depth);
      }
    }

    private FormulaNode unaryExpression(int depth) {
      checkDepth(depth);
      skipWhitespace();
      if (peek('+') || peek('-')) {
        int start = position;
        UnaryOperator operator = source.charAt(position++) == '+'
            ? UnaryOperator.PLUS : UnaryOperator.MINUS;
        FormulaNode operand = unaryExpression(depth + 1);
        return new UnaryOperationNode(operator, operand, start, operand.endOffset());
      }
      return primary(depth + 1);
    }

    private FormulaNode primary(int depth) {
      checkDepth(depth);
      skipWhitespace();
      if (atEnd()) {
        fail(FormulaValidationError.Code.SYNTAX_ERROR, "Expected an expression");
      }
      if (peek('(')) {
        position++;
        final FormulaNode node = binaryExpression(depth + 1, 0,
            mode == FormulaParseMode.CONDITIONAL);
        skipWhitespace();
        if (!peek(')')) {
          fail(FormulaValidationError.Code.SYNTAX_ERROR, "Expected ')'");
        }
        position++;
        return node;
      }
      if (Character.isDigit(source.charAt(position)) || source.charAt(position) == '.') {
        return number();
      }
      if (Character.isLetter(source.charAt(position)) || source.charAt(position) == '_') {
        return identifier(depth);
      }
      fail(FormulaValidationError.Code.SYNTAX_ERROR, "Expected a number, identifier, or '('");
      return null;
    }

    private FormulaNode number() {
      final int start = position;
      boolean digits = false;
      while (!atEnd() && (Character.isDigit(source.charAt(position))
          || source.charAt(position) == '.')) {
        if (Character.isDigit(source.charAt(position))) {
          digits = true;
        }
        position++;
      }
      if (!digits) {
        failAt(FormulaValidationError.Code.SYNTAX_ERROR, "Malformed number", start, position);
      }
      String value = source.substring(start, position);
      try {
        return new LiteralNode(new BigDecimal(value), start, position);
      } catch (NumberFormatException exception) {
        failAt(FormulaValidationError.Code.SYNTAX_ERROR, "Malformed number", start, position);
        return null;
      }
    }

    private FormulaNode identifier(int depth) {
      position++;
      int start = position - 1;
      while (!atEnd() && (Character.isLetterOrDigit(source.charAt(position))
          || source.charAt(position) == '_' || source.charAt(position) == '.')) {
        position++;
      }
      String name = source.substring(start, position);
      int tokenEnd = position;
      skipWhitespace();
      if (peek('(')) {
        if ("IF".equalsIgnoreCase(name)) {
          return ifExpression(start, depth);
        }
        failAt(FormulaValidationError.Code.UNSUPPORTED_FUNCTION,
            "Function calls are not supported", start, position);
      }
      return new VariableReferenceNode(name, start, tokenEnd);
    }

    private FormulaNode ifExpression(int start, int depth) {
      position++;
      final FormulaNode condition = binaryExpression(depth + 1, 0, true);
      requireComma();
      final FormulaNode valueIfTrue = binaryExpression(depth + 1, 0, false);
      requireComma();
      final FormulaNode valueIfFalse = binaryExpression(depth + 1, 0, false);
      skipWhitespace();
      if (!peek(')')) {
        fail(FormulaValidationError.Code.SYNTAX_ERROR, "Expected ')' after IF arguments");
      }
      position++;
      return new IfNode(condition, valueIfTrue, valueIfFalse, start, position);
    }

    private void requireComma() {
      skipWhitespace();
      if (!peek(',')) {
        fail(FormulaValidationError.Code.SYNTAX_ERROR, "Expected ',' between IF arguments");
      }
      position++;
    }

    private BinaryOperator operatorAt(int offset) {
      for (BinaryOperator candidate : new BinaryOperator[] {
          BinaryOperator.LESS_THAN_OR_EQUAL,
          BinaryOperator.GREATER_THAN_OR_EQUAL,
          BinaryOperator.EQUAL,
          BinaryOperator.NOT_EQUAL,
          BinaryOperator.ADD,
          BinaryOperator.SUBTRACT,
          BinaryOperator.MULTIPLY,
          BinaryOperator.DIVIDE,
          BinaryOperator.LESS_THAN,
          BinaryOperator.GREATER_THAN
      }) {
        if (source.startsWith(candidate.symbol(), offset)) {
          return candidate;
        }
      }
      return null;
    }

    private void checkDepth(int depth) {
      if (depth > options.maximumAstDepth()) {
        fail(FormulaValidationError.Code.EXCESSIVE_COMPLEXITY,
            "Formula exceeds the maximum AST depth");
      }
    }

    private void skipWhitespace() {
      while (!atEnd() && Character.isWhitespace(source.charAt(position))) {
        position++;
      }
    }

    private boolean peek(char expected) {
      return !atEnd() && source.charAt(position) == expected;
    }

    private boolean atEnd() {
      return position >= source.length();
    }

    private void fail(FormulaValidationError.Code code, String message) {
      failAt(code, message, position, Math.min(position + 1, source.length()));
    }

    private void failAt(FormulaValidationError.Code code, String message, int start, int end) {
      throw error(code, message, start, end);
    }
  }
}
