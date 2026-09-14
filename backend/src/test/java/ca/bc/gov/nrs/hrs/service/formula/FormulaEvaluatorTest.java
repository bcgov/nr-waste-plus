package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Formula evaluator")
class FormulaEvaluatorTest {
  private static final FormulaParser PARSER = new FormulaParser(new FormulaParser.Options(20, 100));

  @DisplayName("Should evaluate a literal value")
  @Test
  void should_evaluate_literal() {
    FormulaNode ast = PARSER.parse("11.530");

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of());

    assertThat(result).isEqualByComparingTo(new BigDecimal("11.530"));
  }

  @DisplayName("Should resolve a variable from context")
  @Test
  void should_resolve_variable() {
    FormulaNode ast = PARSER.parse("da.mature.total");

    BigDecimal result =
        FormulaEvaluator.evaluate(ast, Map.of("da.mature.total", new BigDecimal("11.530")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("11.530"));
  }

  @DisplayName("Should throw on missing variable")
  @Test
  void should_throw_on_missing_variable() {
    FormulaNode ast = PARSER.parse("da.missing + 1");

    assertThatThrownBy(() -> FormulaEvaluator.evaluate(ast, Map.of()))
        .isInstanceOf(FormulaEvaluationException.class)
        .hasMessageContaining("Missing variable: da.missing");
  }

  @DisplayName("Should evaluate addition with 3-decimal output")
  @Test
  void should_evaluate_addition() {
    FormulaNode ast = PARSER.parse("da.rate + sc.mix");

    BigDecimal result =
        FormulaEvaluator.evaluate(
            ast,
            Map.of(
                "da.rate", new BigDecimal("2.5"),
                "sc.mix", new BigDecimal("0.3")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("2.800"));
  }

  @DisplayName("Should evaluate subtraction")
  @Test
  void should_evaluate_subtraction() {
    FormulaNode ast = PARSER.parse("da.a - da.b");

    BigDecimal result =
        FormulaEvaluator.evaluate(
            ast,
            Map.of(
                "da.a", new BigDecimal("10"),
                "da.b", new BigDecimal("3")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("7.000"));
  }

  @DisplayName("Should evaluate multiplication")
  @Test
  void should_evaluate_multiplication() {
    FormulaNode ast = PARSER.parse("da.a * da.b");

    BigDecimal result =
        FormulaEvaluator.evaluate(
            ast,
            Map.of(
                "da.a", new BigDecimal("2.5"),
                "da.b", new BigDecimal("4")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("10.000"));
  }

  @DisplayName("Should evaluate division with intermediate scale")
  @Test
  void should_evaluate_division() {
    FormulaNode ast = PARSER.parse("da.a / da.b");

    BigDecimal result =
        FormulaEvaluator.evaluate(
            ast,
            Map.of(
                "da.a", new BigDecimal("10"),
                "da.b", new BigDecimal("3")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("3.333"));
  }

  @DisplayName("Should throw on runtime division by zero")
  @Test
  void should_throw_on_runtime_division_by_zero() {
    FormulaNode ast = PARSER.parse("da.rate / da.zero");

    assertThatThrownBy(
            () ->
                FormulaEvaluator.evaluate(
                    ast, Map.of("da.rate", new BigDecimal("10"), "da.zero", BigDecimal.ZERO)))
        .isInstanceOf(FormulaEvaluationException.class)
        .hasMessageContaining("Division by zero");
  }

  @DisplayName("Should respect operator precedence")
  @Test
  void should_respect_precedence() {
    FormulaNode ast = PARSER.parse("1 + 2 * 3");

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of());

    assertThat(result).isEqualByComparingTo(new BigDecimal("7.000"));
  }

  @DisplayName("Should evaluate unary minus")
  @Test
  void should_evaluate_unary_minus() {
    FormulaNode ast = PARSER.parse("-(.5 + 2.00)");

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of());

    assertThat(result).isEqualByComparingTo(new BigDecimal("-2.500"));
  }

  @DisplayName("Should evaluate unary plus")
  @Test
  void should_evaluate_unary_plus() {
    FormulaNode ast = PARSER.parse("+(3.5)");

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of());

    assertThat(result).isEqualByComparingTo(new BigDecimal("3.500"));
  }

  @DisplayName("Should evaluate IF condition true branch")
  @Test
  void should_evaluate_if_true() {
    FormulaNode ast = PARSER.parse("IF(da.rate >= 2, 10, 20)", FormulaParseMode.CONDITIONAL);

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of("da.rate", new BigDecimal("3")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("10.000"));
  }

  @DisplayName("Should evaluate IF condition false branch")
  @Test
  void should_evaluate_if_false() {
    FormulaNode ast = PARSER.parse("IF(da.rate >= 2, 10, 20)", FormulaParseMode.CONDITIONAL);

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of("da.rate", new BigDecimal("1")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("20.000"));
  }

  @DisplayName("Should evaluate case-insensitive IF")
  @Test
  void should_evaluate_case_insensitive_if() {
    FormulaNode ast = PARSER.parse("iF(da.rate >= 2, 10, 20)", FormulaParseMode.CONDITIONAL);

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of("da.rate", new BigDecimal("5")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("10.000"));
  }

  @DisplayName("Should evaluate nested IF")
  @Test
  void should_evaluate_nested_if() {
    FormulaNode ast =
        PARSER.parse("IF(da.rate >= 2, 10, IF(sc.value == 1, 3, 4))", FormulaParseMode.CONDITIONAL);

    BigDecimal result =
        FormulaEvaluator.evaluate(
            ast,
            Map.of(
                "da.rate", new BigDecimal("1"),
                "sc.value", new BigDecimal("1")));

    assertThat(result).isEqualByComparingTo(new BigDecimal("3.000"));
  }

  @DisplayName("Should evaluate all comparison operators")
  @Test
  void should_evaluate_comparison_operators() {
    var vars = Map.of("da.a", new BigDecimal("5"), "da.b", new BigDecimal("3"));

    assertThat(evaluate("da.a > da.b", vars)).isEqualByComparingTo(BigDecimal.ONE);
    assertThat(evaluate("da.a >= da.b", vars)).isEqualByComparingTo(BigDecimal.ONE);
    assertThat(evaluate("da.a < da.b", vars)).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(evaluate("da.a <= da.b", vars)).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(evaluate("da.a == da.b", vars)).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(evaluate("da.a != da.b", vars)).isEqualByComparingTo(BigDecimal.ONE);
    assertThat(evaluate("da.a == da.a", vars)).isEqualByComparingTo(BigDecimal.ONE);
  }

  @DisplayName("Should round HALF_UP to 3 decimals")
  @Test
  void should_round_half_up() {
    FormulaNode roundUp = PARSER.parse("0.0005");
    FormulaNode roundDown = PARSER.parse("0.0004");

    assertThat(FormulaEvaluator.evaluate(roundUp, Map.of()))
        .isEqualByComparingTo(new BigDecimal("0.001"));
    assertThat(FormulaEvaluator.evaluate(roundDown, Map.of()))
        .isEqualByComparingTo(new BigDecimal("0.000"));
  }

  @DisplayName("Should evaluate parentheses overriding precedence")
  @Test
  void should_evaluate_parentheses() {
    FormulaNode ast = PARSER.parse("(1 + 2) * 3");

    BigDecimal result = FormulaEvaluator.evaluate(ast, Map.of());

    assertThat(result).isEqualByComparingTo(new BigDecimal("9.000"));
  }

  private BigDecimal evaluate(String expression, Map<String, BigDecimal> vars) {
    FormulaNode ast = PARSER.parse(expression, FormulaParseMode.CONDITIONAL);
    return FormulaEvaluator.evaluate(ast, vars);
  }
}
