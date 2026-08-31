package ca.bc.gov.nrs.hrs.service.formula;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Formula validator")
class FormulaValidatorTest {
  private static final FormulaValidator VALIDATOR =
      new FormulaValidator(new FormulaParser.Options(30, 200));

  @Test
  void should_accept_known_typed_variables_and_reject_unknowns() {
    FormulaValidationRequest request = request(
         List.of(new FormulaDefinition("total", "da.rate * submission.area + sc.CW")),
         Map.of("da.rate", BigDecimal.ONE, "submission.area", BigDecimal.TEN,
             "sc.CW", BigDecimal.ONE));

    assertThat(VALIDATOR.validate(request)).isEmpty();
    assertThat(VALIDATOR.validate(request(
         List.of(new FormulaDefinition("total", "outside.value + da.missing")),
        Map.of()))
    ).extracting(FormulaValidationError::code)
        .containsExactly(FormulaValidationError.Code.UNKNOWN_VARIABLE,
            FormulaValidationError.Code.UNKNOWN_VARIABLE);
  }

  @Test
  void should_report_static_division_by_zero() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
        List.of(new FormulaDefinition("total", "10 / (2 - 2)")), Map.of()));

    assertThat(errors).extracting(FormulaValidationError::code)
        .containsExactly(FormulaValidationError.Code.DIVISION_BY_ZERO);
  }

  @Test
  void should_accept_all_approved_namespaces_and_reject_retired_namespaces() {
    assertThat(VALIDATOR.validate(request(
        List.of(new FormulaDefinition("total", "da.a + sc.b + submission.c + hbs.d + fta.e")),
        Map.of("da.a", BigDecimal.ONE, "sc.b", BigDecimal.ONE, "submission.c", BigDecimal.ONE,
            "hbs.d", BigDecimal.ONE, "fta.e", BigDecimal.ONE)))).isEmpty();
    assertThat(VALIDATOR.validate(request(
        List.of(new FormulaDefinition("total", "config.a + species.b")), Map.of())))
        .extracting(FormulaValidationError::code)
        .containsExactly(FormulaValidationError.Code.UNKNOWN_VARIABLE,
            FormulaValidationError.Code.UNKNOWN_VARIABLE);
  }

  @Test
  void should_type_check_if_and_validate_both_branches() {
    assertThat(VALIDATOR.validate(request(
        List.of(new FormulaDefinition("total", "IF(da.rate >= 2, 10, sc.value + 1)")),
        Map.of("da.rate", BigDecimal.ONE, "sc.value", BigDecimal.ONE)))).isEmpty();
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
        List.of(new FormulaDefinition("total", "IF(da.rate, 10, broken.value)")),
        Map.of("da.rate", BigDecimal.ONE)));
    assertThat(errors).extracting(FormulaValidationError::code)
        .containsExactly(FormulaValidationError.Code.UNKNOWN_VARIABLE,
            FormulaValidationError.Code.TYPE_ERROR);
  }

  @Test
  void should_validate_unused_if_branch_and_allow_if_in_math_mode() {
    List<FormulaValidationError> errors = VALIDATOR.validate(new FormulaValidationRequest(
        List.of(new FormulaDefinition("total", "IF(da.rate >= 2, 1, broken.value) * 2")),
        Map.of("da.rate", BigDecimal.ONE), FormulaParseMode.MATHEMATICAL));

    assertThat(errors).extracting(FormulaValidationError::code)
        .containsExactly(FormulaValidationError.Code.UNKNOWN_VARIABLE);
  }

  @Test
  void should_report_zero_valued_known_variables() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
         List.of(new FormulaDefinition("total", "10 / da.denominator")),
         Map.of("da.denominator", BigDecimal.ZERO)));

    assertThat(errors).extracting(FormulaValidationError::code)
        .containsExactly(FormulaValidationError.Code.DIVISION_BY_ZERO);
  }

  @Test
  void should_detect_self_and_disconnected_cycles_deterministically() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
        List.of(new FormulaDefinition("z", "z + 1"), new FormulaDefinition("a", "b + 1"),
            new FormulaDefinition("b", "a + 1"), new FormulaDefinition("safe", "1")), Map.of()));

    assertThat(errors).extracting(FormulaValidationError::message)
        .containsExactly("Formula dependency cycle detected at: a",
            "Formula dependency cycle detected at: b", "Formula dependency cycle detected at: z");
  }

  @Test
  void should_report_duplicates_and_preserve_parse_errors() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
        List.of(new FormulaDefinition("same", "1"), new FormulaDefinition("same", "2"),
            new FormulaDefinition("broken", "1 +")), Map.of()));

    assertThat(errors).extracting(FormulaValidationError::code)
        .containsExactly(FormulaValidationError.Code.SYNTAX_ERROR,
            FormulaValidationError.Code.SYNTAX_ERROR);
  }

  @Test
  void should_validate_save_facade() {
    FormulaValidationService service = new FormulaValidationService(
        new FormulaParser.Options(10, 100));

    assertThat(service.validateForSave(request(
        List.of(new FormulaDefinition("x", "hbs.factor + 1")),
        Map.of("hbs.factor", BigDecimal.ONE)))).isEmpty();
  }

  @Test
  void should_reject_invalid_definition_and_request_inputs() {
    assertThatThrownBy(() -> new FormulaDefinition("", "1"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FormulaDefinition("x", " "))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> new FormulaValidationRequest(
        null, Map.of(), FormulaParseMode.MATHEMATICAL))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> new FormulaValidationRequest(
        List.of(), null, FormulaParseMode.MATHEMATICAL))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> new FormulaValidationRequest(List.of(), Map.of(), null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> new FormulaValidator(null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> new FormulaValidationService(null))
        .isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> VALIDATOR.validate(null))
        .isInstanceOf(NullPointerException.class);
  }

  @Test
  void should_handle_constant_unary_arithmetic_without_division_error() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
        List.of(new FormulaDefinition("total", "10 / -(2 + 3)")), Map.of()));

    assertThat(errors).isEmpty();
  }

  @Test
  void should_cover_constant_multiplication_and_non_constant_division() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
         List.of(new FormulaDefinition("total", "(2 * 3) / da.denominator")),
         Map.of("da.denominator", BigDecimal.ONE)));

    assertThat(errors).isEmpty();
  }

  @Test
  void should_not_report_cycle_for_revisited_shared_dependency() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
         List.of(new FormulaDefinition("base", "da.rate"),
            new FormulaDefinition("left", "base + 1"),
            new FormulaDefinition("right", "base + 2"),
             new FormulaDefinition("total", "left + right")),
         Map.of("da.rate", BigDecimal.ONE)));

    assertThat(errors).isEmpty();
  }

  @Test
  void should_resolve_formula_key_dependencies_without_unknown_variable_errors() {
    List<FormulaValidationError> errors = VALIDATOR.validate(request(
         List.of(new FormulaDefinition("base", "da.rate"),
             new FormulaDefinition("total", "base * 2")),
         Map.of("da.rate", BigDecimal.ONE)));

    assertThat(errors).isEmpty();
  }

  private FormulaValidationRequest request(List<FormulaDefinition> definitions,
      Map<String, BigDecimal> variables) {
    return new FormulaValidationRequest(definitions, variables, FormulaParseMode.CONDITIONAL);
  }
}
