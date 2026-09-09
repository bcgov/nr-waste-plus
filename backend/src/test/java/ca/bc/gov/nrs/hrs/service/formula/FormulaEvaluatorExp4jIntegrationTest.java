package ca.bc.gov.nrs.hrs.service.formula;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FormulaEvaluatorExp4jIntegrationTest {

    @Test
    void evaluatesSqrtAndSinWithRounding() {
        String expression = "sqrt(da.area) + sin(sc.factor)";
        Map<String, BigDecimal> variables = Map.of(
                "da.area", new BigDecimal("16"),
                "sc.factor", new BigDecimal("1.57079632679")
        );

        BigDecimal result = FormulaEvaluatorExp4j.evaluate(expression, variables);
        assertEquals(new BigDecimal("5.000"), result);
    }

    @Test
    void evaluatesSimpleArithmeticWithRounding() {
        String expression = "da.a + sc.b * 2.5";
        Map<String, BigDecimal> variables = Map.of(
                "da.a", new BigDecimal("1.2345"),
                "sc.b", new BigDecimal("2.0000")
        );

        BigDecimal result = FormulaEvaluatorExp4j.evaluate(expression, variables);
        assertEquals(new BigDecimal("6.235"), result);
    }

    @Test
    void evaluatesIfFunctionTrueBranch() {
        String expression = "if(da.flag, 10, 20)";
        Map<String, BigDecimal> variables = Map.of("da.flag", BigDecimal.ONE);
        BigDecimal result = FormulaEvaluatorExp4j.evaluate(expression, variables);
        assertEquals(new BigDecimal("10.000"), result);
    }

    @Test
    void evaluatesIfFunctionFalseBranch() {
        String expression = "if(da.flag, 10, 20)";
        Map<String, BigDecimal> variables = Map.of("da.flag", BigDecimal.ZERO);
        BigDecimal result = FormulaEvaluatorExp4j.evaluate(expression, variables);
        assertEquals(new BigDecimal("20.000"), result);
    }

    @Test
    void rejectsUnsupportedFunction() {
        String expression = "unknownFunc(da.a)";
        Map<String, BigDecimal> variables = Map.of("da.a", BigDecimal.ONE);
        assertThrows(FormulaEvaluationException.class, () -> FormulaEvaluatorExp4j.evaluate(expression, variables));
    }

    @Test
    void rejectsMissingVariable() {
        String expression = "da.a + sc.b";
        Map<String, BigDecimal> variables = Map.of("da.a", BigDecimal.ONE);
        assertThrows(FormulaEvaluationException.class, () -> FormulaEvaluatorExp4j.evaluate(expression, variables));
    }

    @Test
    void rejectsDivisionByZero() {
        String expr = "10 / 0";
        assertThrows(FormulaEvaluationException.class, () -> FormulaEvaluatorExp4j.evaluate(expr, Map.of()));
    }

    @Test
    void rejectsExpressionTooLong() {
        String expression = "a".repeat(101);
        Map<String, BigDecimal> variables = Map.of("a", BigDecimal.ONE);
        assertThrows(FormulaEvaluationException.class, () -> FormulaEvaluatorExp4j.evaluate(expression, variables));
    }

    // ── Parity fixtures (mirrors frontend parity-fixtures.ts) ──

    @Test
    void parityArithmeticAddition() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("1 + 2", Map.of());
        assertEquals(new BigDecimal("3"), result);
    }

    @Test
    void parityArithmeticPrecedence() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("1 + 2 * 3", Map.of());
        assertEquals(new BigDecimal("7"), result);
    }

    @Test
    void parityArithmeticParentheses() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("(1 + 2) * 3", Map.of());
        assertEquals(new BigDecimal("9"), result);
    }

    @Test
    void parityArithmeticVariables() {
        Map<String, BigDecimal> vars = Map.of(
                "da.rate", new BigDecimal("2.5"),
                "hours", new BigDecimal("4"),
                "bonus", new BigDecimal("1")
        );
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("da.rate * hours + bonus", vars);
        assertEquals(new BigDecimal("11"), result);
    }

    @Test
    void parityArithmeticUnaryMinus() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("-(1 + 2)", Map.of());
        assertEquals(new BigDecimal("-3"), result);
    }

    @Test
    void parityRoundingHalfUpAt5() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("1.2345", Map.of());
        assertEquals(new BigDecimal("1.235"), result);
    }

    @Test
    void parityRoundingBelow5() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("1.2344", Map.of());
        assertEquals(new BigDecimal("1.234"), result);
    }

    @Test
    void parityRoundingAtMidpoint() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("1.2335", Map.of());
        assertEquals(new BigDecimal("1.234"), result);
    }

    @Test
    void parityRoundingExact3Decimals() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("1.234", Map.of());
        assertEquals(new BigDecimal("1.234"), result);
    }

    @Test
    void parityRoundingWholeNumber() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("3.000", Map.of());
        assertEquals(new BigDecimal("3"), result);
    }

    @Test
    void parityFnSqrt() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("sqrt(16)", Map.of());
        assertEquals(new BigDecimal("4"), result);
    }

    @Test
    void parityFnAbs() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("abs(-5)", Map.of());
        assertEquals(new BigDecimal("5"), result);
    }

    @Test
    void parityFnMin() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("min(3, 7)", Map.of());
        assertEquals(new BigDecimal("3"), result);
    }

    @Test
    void parityFnMax() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("max(3, 7)", Map.of());
        assertEquals(new BigDecimal("7"), result);
    }

    @Test
    void parityFnSin() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("sin(pi / 2)", Map.of());
        assertEquals(new BigDecimal("1"), result);
    }

    @Test
    void parityFnFloor() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("floor(3.7)", Map.of());
        assertEquals(new BigDecimal("3"), result);
    }

    @Test
    void parityFnCeil() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("ceil(3.2)", Map.of());
        assertEquals(new BigDecimal("4"), result);
    }

    @Test
    void parityIfTrueBranch() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("if(1, 10, 20)", Map.of());
        assertEquals(new BigDecimal("10"), result);
    }

    @Test
    void parityIfFalseBranch() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("if(0, 10, 20)", Map.of());
        assertEquals(new BigDecimal("20"), result);
    }

    @Test
    void parityIfComparison() {
        Map<String, BigDecimal> vars = Map.of("da.rate", new BigDecimal("3"));
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("if(da.rate >= 2, 10, 20)", vars);
        assertEquals(new BigDecimal("10"), result);
    }

    @Test
    void parityIfNested() {
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("if(1, if(0, 3, 4), 5)", Map.of());
        assertEquals(new BigDecimal("4"), result);
    }

    @Test
    void parityMixedTrigAndVariables() {
        Map<String, BigDecimal> vars = Map.of(
                "da.area", new BigDecimal("16"),
                "sc.factor", new BigDecimal("1.57079632679")
        );
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("sqrt(da.area) + sin(sc.factor)", vars);
        assertEquals(new BigDecimal("5"), result);
    }

    @Test
    void parityMixedNamespaceVariables() {
        Map<String, BigDecimal> vars = Map.of(
                "da.rate", new BigDecimal("1.5"),
                "sc.mix", new BigDecimal("2.5"),
                "submission.area", new BigDecimal("3")
        );
        BigDecimal result = FormulaEvaluatorExp4j.evaluate("da.rate + sc.mix + submission.area", vars);
        assertEquals(new BigDecimal("7"), result);
    }
}