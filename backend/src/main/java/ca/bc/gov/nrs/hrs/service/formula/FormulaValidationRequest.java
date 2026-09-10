package ca.bc.gov.nrs.hrs.service.formula;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Immutable save-time validation input. */
public record FormulaValidationRequest(
    List<FormulaDefinition> formulas,
    Map<String, BigDecimal> knownVariables,
    FormulaParseMode mode) {
  /** Validates and defensively copies the request collections. */
  public FormulaValidationRequest {
    formulas = List.copyOf(Objects.requireNonNull(formulas, "formulas"));
    knownVariables = Map.copyOf(Objects.requireNonNull(knownVariables, "knownVariables"));
    mode = Objects.requireNonNull(mode, "mode");
  }
}
