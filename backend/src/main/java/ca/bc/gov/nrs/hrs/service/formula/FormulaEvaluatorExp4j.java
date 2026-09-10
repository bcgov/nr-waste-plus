package ca.bc.gov.nrs.hrs.service.formula;

import net.objecthunter.exp4j.Expression;
import net.objecthunter.exp4j.ExpressionBuilder;
import net.objecthunter.exp4j.function.Function;
import net.objecthunter.exp4j.operator.Operator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

// No additional imports needed; FormulaEvaluationException is in same package

public final class FormulaEvaluatorExp4j {

    private static final int OUTPUT_SCALE = 3;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private static final Function SQRT = new Function("sqrt", 1) {
        @Override public double apply(double... args) { return Math.sqrt(args[0]); }
    };
    private static final Function SIN = new Function("sin", 1) {
        @Override public double apply(double... args) { return Math.sin(args[0]); }
    };
    private static final Function COS = new Function("cos", 1) {
        @Override public double apply(double... args) { return Math.cos(args[0]); }
    };
    private static final Function TAN = new Function("tan", 1) {
        @Override public double apply(double... args) { return Math.tan(args[0]); }
    };
    private static final Function ASIN = new Function("asin", 1) {
        @Override public double apply(double... args) { return Math.asin(args[0]); }
    };
    private static final Function ACOS = new Function("acos", 1) {
        @Override public double apply(double... args) { return Math.acos(args[0]); }
    };
    private static final Function ATAN = new Function("atan", 1) {
        @Override public double apply(double... args) { return Math.atan(args[0]); }
    };
    private static final Function LOG = new Function("log", 1) {
        @Override public double apply(double... args) { return Math.log(args[0]); }
    };
    private static final Function LN = new Function("ln", 1) {
        @Override public double apply(double... args) { return Math.log(args[0]); }
    };
    private static final Function EXP = new Function("exp", 1) {
        @Override public double apply(double... args) { return Math.exp(args[0]); }
    };
    private static final Function ABS = new Function("abs", 1) {
        @Override public double apply(double... args) { return Math.abs(args[0]); }
    };
    private static final Function CEIL = new Function("ceil", 1) {
        @Override public double apply(double... args) { return Math.ceil(args[0]); }
    };
    private static final Function FLOOR = new Function("floor", 1) {
        @Override public double apply(double... args) { return Math.floor(args[0]); }
    };
    private static final Function POW = new Function("pow", 2) {
        @Override public double apply(double... args) { return Math.pow(args[0], args[1]); }
    };
    private static final Function MAX = new Function("max", 2) {
        @Override public double apply(double... args) { return Math.max(args[0], args[1]); }
    };
    private static final Function MIN = new Function("min", 2) {
        @Override public double apply(double... args) { return Math.min(args[0], args[1]); }
    };
    private static final Function IF = new Function("if", 3) {
        @Override public double apply(double... args) { return args[0] != 0.0 ? args[1] : args[2]; }
    };

    private static final Operator GT = new Operator(">", 2, true, Operator.PRECEDENCE_ADDITION - 1) {
        @Override public double apply(double... values) { return values[0] > values[1] ? 1.0 : 0.0; }
    };
    private static final Operator LT = new Operator("<", 2, true, Operator.PRECEDENCE_ADDITION - 1) {
        @Override public double apply(double... values) { return values[0] < values[1] ? 1.0 : 0.0; }
    };
    private static final Operator GTE = new Operator(">=", 2, true, Operator.PRECEDENCE_ADDITION - 1) {
        @Override public double apply(double... values) { return values[0] >= values[1] ? 1.0 : 0.0; }
    };
    private static final Operator LTE = new Operator("<=", 2, true, Operator.PRECEDENCE_ADDITION - 1) {
        @Override public double apply(double... values) { return values[0] <= values[1] ? 1.0 : 0.0; }
    };
    private static final Operator EQ = new Operator("==", 2, true, Operator.PRECEDENCE_ADDITION - 1) {
        @Override public double apply(double... values) { return values[0] == values[1] ? 1.0 : 0.0; }
    };
    private static final Operator NEQ = new Operator("!=", 2, true, Operator.PRECEDENCE_ADDITION - 1) {
        @Override public double apply(double... values) { return values[0] != values[1] ? 1.0 : 0.0; }
    };

    private FormulaEvaluatorExp4j() {}

    public static BigDecimal evaluate(String expression, Map<String, BigDecimal> variables) {
        if (expression == null || expression.isBlank()) {
            throw new FormulaEvaluationException("Empty expression");
        }

        double rawResult;
        try {
            Expression exp = new ExpressionBuilder(expression)
                    .variables(variables.keySet())
                    .functions(SQRT, SIN, COS, TAN, ASIN, ACOS, ATAN, LOG, LN, EXP, ABS, CEIL, FLOOR, POW, MAX, MIN, IF)
                    .operator(GT)
                    .operator(LT)
                    .operator(GTE)
                    .operator(LTE)
                    .operator(EQ)
                    .operator(NEQ)
                    .build();

            for (Map.Entry<String, BigDecimal> e : variables.entrySet()) {
                exp.setVariable(e.getKey(), e.getValue().doubleValue());
            }

            rawResult = exp.evaluate();
        } catch (ArithmeticException ae) {
            throw new FormulaEvaluationException("Division by zero");
        } catch (Exception e) {
            throw new FormulaEvaluationException(e.getMessage());
        }

        if (Double.isNaN(rawResult) || Double.isInfinite(rawResult)) {
            throw new FormulaEvaluationException("Invalid numeric result");
        }

        return BigDecimal.valueOf(rawResult).setScale(OUTPUT_SCALE, ROUNDING);
    }
}
