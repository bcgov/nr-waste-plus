package ca.bc.gov.nrs.hrs.service.formula;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/** Extracts variable paths without imposing a catalog on runtime namespaces. */
public final class FormulaVariableExtractor {
  private static final Pattern VARIABLE = Pattern.compile(
      "\\b(?:da|sc|submission|hbs|fta)\\.[A-Za-z][A-Za-z0-9_.]*\\b");

  private FormulaVariableExtractor() {}

  /** Returns distinct canonical namespace paths from an expression. */
  public static Set<String> extract(String expression, FormulaParseMode mode) {
    Objects.requireNonNull(mode, "mode must not be null");
    Set<String> variables = new LinkedHashSet<>();
    var matcher = VARIABLE.matcher(expression);
    while (matcher.find()) {
      variables.add(matcher.group());
    }
    return Set.copyOf(variables);
  }
}
