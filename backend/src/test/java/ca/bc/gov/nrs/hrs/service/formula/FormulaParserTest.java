package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Formula parser")
class FormulaParserTest {
  private static final FormulaParser PARSER =
      new FormulaParser(new FormulaParser.Options(20, 100));

  @Test
  void should_parse_precedence_and_offsets() {
    FormulaNode node = PARSER.parse(" 1 + 2 * 3 ");

    assertThat(node).isInstanceOf(BinaryOperationNode.class);
    BinaryOperationNode addition = (BinaryOperationNode) node;
    assertThat(addition.operator()).isEqualTo(BinaryOperator.ADD);
    assertThat(addition.startOffset()).isEqualTo(1);
    assertThat(addition.endOffset()).isEqualTo(10);
    assertThat(addition.right()).isInstanceOf(BinaryOperationNode.class);
  }

  @Test
  void should_parse_decimal_unary_and_parentheses() {
    FormulaNode node = PARSER.parse("-(.5 + 2.00)", FormulaParseMode.CONDITIONAL);

    assertThat(node).isInstanceOf(UnaryOperationNode.class);
    assertThat(((UnaryOperationNode) node).operand()).isInstanceOf(BinaryOperationNode.class);
    BinaryOperationNode binary = (BinaryOperationNode) ((UnaryOperationNode) node).operand();
    assertThat(((LiteralNode) binary.left()).value()).isEqualByComparingTo(new BigDecimal(".5"));
  }

  @Test
  void should_parse_comparisons_only_in_conditional_mode() {
    FormulaNode node = PARSER.parse("da.rate >= 2", FormulaParseMode.CONDITIONAL);

    assertThat(((BinaryOperationNode) node).operator())
        .isEqualTo(BinaryOperator.GREATER_THAN_OR_EQUAL);
    assertThatThrownBy(() -> PARSER.parse("1 < 2"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().code())
        .isEqualTo(FormulaValidationError.Code.SYNTAX_ERROR);
  }

  @Test
  void should_reject_calls_and_malformed_tokens_with_offsets() {
    assertThatThrownBy(() -> PARSER.parse("sqrt(4)"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error())
        .satisfies(error -> assertThat(error).isEqualTo(new FormulaValidationError(
            FormulaValidationError.Code.UNSUPPORTED_FUNCTION,
            "Function calls are not supported", 0, 4)));
    assertThatThrownBy(() -> PARSER.parse("1 + @"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().startOffset())
        .isEqualTo(4);
    assertThatThrownBy(() -> PARSER.parse("1 + 2 extra"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().message())
        .isEqualTo("Unexpected token");
  }

  @Test
  void should_reject_limits_and_unclosed_parentheses() {
    assertThatThrownBy(() -> new FormulaParser(new FormulaParser.Options(2, 100)).parse("(((1)))"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().code())
        .isEqualTo(FormulaValidationError.Code.EXCESSIVE_COMPLEXITY);
    assertThatThrownBy(() -> PARSER.parse("1".repeat(101)))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().code())
        .isEqualTo(FormulaValidationError.Code.EXCESSIVE_COMPLEXITY);
    assertThatThrownBy(() -> PARSER.parse("(1 + 2"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().message())
        .isEqualTo("Expected ')'");
  }

  @Test
  void should_reject_invalid_limits_and_null_inputs() {
    assertThatThrownBy(() -> new FormulaParser.Options(0, 1))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FormulaParser.Options(1, 0))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> PARSER.parse(null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> PARSER.parse("1", null))
        .isInstanceOf(NullPointerException.class);
  }

  @Test
  void should_reject_empty_and_malformed_numbers() {
    assertThatThrownBy(() -> PARSER.parse("   "))
        .isInstanceOf(FormulaParseException.class);
    assertThatThrownBy(() -> PARSER.parse("."))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error())
        .isEqualTo(new FormulaValidationError(
            FormulaValidationError.Code.SYNTAX_ERROR, "Malformed number", 0, 1));
    assertThatThrownBy(() -> PARSER.parse("12..34"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error())
        .isEqualTo(new FormulaValidationError(
            FormulaValidationError.Code.SYNTAX_ERROR, "Malformed number", 0, 6));
    assertThatThrownBy(() -> PARSER.parse("1.2.3"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error())
        .isEqualTo(new FormulaValidationError(
            FormulaValidationError.Code.SYNTAX_ERROR, "Malformed number", 0, 5));
    assertThatThrownBy(() -> PARSER.parse("1 2"))
        .isInstanceOf(FormulaParseException.class);
  }

  @Test
  void should_parse_all_binary_operators_in_conditional_mode() {
    for (String operator : new String[] {"+", "-", "*", "/", "<", "<=", ">", ">=", "==", "!="}) {
      assertThat(PARSER.parse("1 " + operator + " 2", FormulaParseMode.CONDITIONAL))
          .isInstanceOf(BinaryOperationNode.class);
    }
  }

  @Test
  void should_reject_remaining_unsupported_syntax() {
    for (String expression : new String[] {"1 % 2", "1 ^ 2", "1 && 2", "1 = 2", "1;2"}) {
      assertThatThrownBy(() -> PARSER.parse(expression, FormulaParseMode.CONDITIONAL))
          .isInstanceOf(FormulaParseException.class)
          .extracting(exception -> ((FormulaParseException) exception).error().code())
          .isEqualTo(FormulaValidationError.Code.SYNTAX_ERROR);
    }
  }

  @Test
  void should_parse_if_with_nested_if_and_offsets() {
    FormulaNode node = PARSER.parse("IF(da.rate >= 2, 10, IF(sc.CW == 1, 3, 4))");

    assertThat(node).isInstanceOf(IfNode.class);
    IfNode outer = (IfNode) node;
    assertThat(outer.startOffset()).isZero();
    assertThat(outer.endOffset()).isEqualTo(42);
    assertThat(outer.condition()).isInstanceOf(BinaryOperationNode.class);
    assertThat(outer.valueIfFalse()).isInstanceOf(IfNode.class);
  }

  @Test
  void should_parse_if_function_without_case_sensitivity() {
    for (String functionName : new String[] {"IF", "if", "If", "iF"}) {
      assertThat(PARSER.parse(functionName + "(1 < 2, 3, 4)"))
          .isInstanceOf(IfNode.class);
    }
  }

  @Test
  void should_enforce_maximum_depth_for_nested_if_expressions() {
    FormulaParser parser = new FormulaParser(new FormulaParser.Options(5, 200));

    assertThatThrownBy(() -> parser.parse("IF(1 < 2, 3, IF(4 < 5, 6, 7))"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().code())
        .isEqualTo(FormulaValidationError.Code.EXCESSIVE_COMPLEXITY);
  }

  @Test
  void should_reject_malformed_if_and_unsupported_functions() {
    for (String expression : new String[] {
        "IF(1 < 2, 3)", "IF(1 < 2 3, 4)", "IF(1 < 2, 3, 4",
        "IF(1 < 2, 3, 4, 5)", "IF(1 < 2, 3 4, 5)", "MAX(1, 2)"}) {
      assertThatThrownBy(() -> PARSER.parse(expression))
          .isInstanceOf(FormulaParseException.class);
    }
  }

  @Test
  void should_report_missing_operands_and_invalid_primary_tokens() {
    assertThatThrownBy(() -> PARSER.parse("1 +"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().message())
        .isEqualTo("Expected an expression");
    assertThatThrownBy(() -> PARSER.parse("@"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().message())
        .isEqualTo("Expected a number, identifier, or '('");
    assertThatThrownBy(() -> PARSER.parse("()"))
        .isInstanceOf(FormulaParseException.class)
        .extracting(exception -> ((FormulaParseException) exception).error().message())
        .isEqualTo("Expected a number, identifier, or '('");
  }

  @Test
  void should_expose_unary_operator_symbols_in_the_ast() {
    UnaryOperationNode plus = (UnaryOperationNode) PARSER.parse("+1");
    UnaryOperationNode minus = (UnaryOperationNode) PARSER.parse("-1");

    assertThat(plus.operator().symbol()).isEqualTo("+");
    assertThat(minus.operator().symbol()).isEqualTo("-");
  }
}
