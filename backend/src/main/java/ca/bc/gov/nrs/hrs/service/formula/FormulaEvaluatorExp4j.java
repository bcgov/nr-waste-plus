package ca.bc.gov.nrs.hrs.service.formula;

import net.objecthunter.exp4j.Expression;
import net.objecthunter.exp4j.ExpressionBuilder;
import net.objecthunter.exp4j.function.Function;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Set;

public final class FormulaEvaluatorExp4j {

    private static final int INTERMEDIATE_SCALE = 12;
    private static final int OUTPUT_SCALE = 3;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private static final Set<String> WHITELISTED_FUNCTIONS = Set.of(
            "sqrt", "sin", "cos", "tan", "asin", "acos", "atan",
            "log", "ln", "exp", "abs", "ceil", "floor", "pow", "max", "min"
    );

    private FormulaEvaluatorExp4j() {}

    public static BigDecimal evaluate(String expression, Map<String, BigDecimal> variables) {
        if (expression == null || expression.isBlank()) {
            throw new FormulaEvaluationException("Empty expression");
        }
        if (expression.length() > 100) {
            throw new FormulaEvaluationException("Formula exceeds maximum expression length");
        }
        validateFunctionWhitelist(expression);
        validateVariablesPresent(expression, variables);

        ExpressionBuilder builder = new ExpressionBuilder(expression)
                .variables(variables.keySet())
                .function(new net.objecthunter.exp4j.function.Function("if", 3) {
                    @Override
                    public double apply(double... args) {
                        if (args.length != 3) {
                            throw new IllegalArgumentException("IF requires 3 arguments");
                        }
                        return args[0] != 0.0 ? args[1] : args[2];
                    }
                });

        Expression exp = builder.build();

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

        BigDecimal bd = BigDecimal.valueOf(rawResult);
        return bd.setScale(OUTPUT_SCALE, ROUNDING);
    }

    private static void validateFunctionWhitelist(String expression) {
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("[a-zA-Z_]\\w*\\s*\\(");
        java.util.regex.Matcher m = p.matcher(expression);
        while (m.find()) {
            String name = m.group().replaceAll("\\s*\\(", "").toLowerCase();
            if ("if".equals(name)) continue;
            if (!WHITELISTED_FUNCTIONS.contains(name)) {
                throw new FormulaEvaluationException("Unsupported function: " + name);
            }
        }
    }

    private static void validateVariablesPresent(String expression, Map<String, BigDecimal> variables) {
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\b[a-zA-Z_][a-zA-Z0-9_.]*\\b");
        java.util.regex.Matcher m = p.matcher(expression);
        while (m.find()) {
            String token = m.group();
            if (isOperatorOrNumberOrFunction(token)) continue;
            if (!variables.containsKey(token)) {
                throw new FormulaEvaluationException("Missing variable: " + token);
            }
        }
    }

    private static boolean isOperatorOrNumberOrFunction(String token) {
        if (token.matches("[+\\-*/^(),]")) return true;
        if (token.matches("\\d+(\\.\\d+)?")) return true;
        if (WHITELISTED_FUNCTIONS.contains(token.toLowerCase()) || "if".equalsIgnoreCase(token)) return true;
        return false;
    }
}