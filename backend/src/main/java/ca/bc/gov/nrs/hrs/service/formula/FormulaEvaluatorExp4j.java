package ca.bc.gov.nrs.hrs.service.formula;

import net.objecthunter.exp4j.Expression;
import net.objecthunter.exp4j.ExpressionBuilder;
import net.objecthunter.exp4j.function.Function;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

public final class FormulaEvaluatorExp4j {

    private static final int OUTPUT_SCALE = 3;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    /** exp4j does not provide a built-in {@code ln} — register it as an alias for {@code log}. */
    private static final Function LN = new Function("ln", 1) {
        @Override
        public double apply(double... args) {
            return Math.log(args[0]);
        }
    };

    private static final Function IF = new Function("if", 3) {
        @Override
        public double apply(double... args) {
            return args[0] != 0.0 ? args[1] : args[2];
        }
    };

    private static final Function MIN = new Function("min", 2) {
        @Override
        public double apply(double... args) {
            return Math.min(args[0], args[1]);
        }
    };

    private static final Function MAX = new Function("max", 2) {
        @Override
        public double apply(double... args) {
            return Math.max(args[0], args[1]);
        }
    };

    private FormulaEvaluatorExp4j() {}

    public static BigDecimal evaluate(String expression, Map<String, BigDecimal> variables) {
        if (expression == null || expression.isBlank()) {
            throw new FormulaEvaluationException("Empty expression");
        }

        Expression exp = new ExpressionBuilder(expression)
                .variables(variables.keySet())
                .functions(LN, IF, MIN, MAX)
                .build();

        for (Map.Entry<String, BigDecimal> e : variables.entrySet()) {
            exp.setVariable(e.getKey(), e.getValue().doubleValue());
        }

        double rawResult;
        try {
            rawResult = exp.evaluate();
        } catch (ArithmeticException ae) {
            throw new FormulaEvaluationException("Division by zero");
        }

        if (Double.isNaN(rawResult) || Double.isInfinite(rawResult)) {
            throw new FormulaEvaluationException("Invalid numeric result");
        }

        return BigDecimal.valueOf(rawResult).setScale(OUTPUT_SCALE, ROUNDING);
    }
}
