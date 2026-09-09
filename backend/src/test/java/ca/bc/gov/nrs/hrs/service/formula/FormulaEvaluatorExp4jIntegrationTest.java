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
}