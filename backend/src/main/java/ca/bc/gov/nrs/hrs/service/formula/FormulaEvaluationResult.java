package ca.bc.gov.nrs.hrs.service.formula;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.Map;

/**
 * Evaluation outputs and metadata for snapshot creation.
 *
 * @param outputs  formula-key → computed BigDecimal result
 * @param inputs   resolved variable values as JSON (for snapshot inputs column)
 * @param warnings rounding or data-quality warnings as JSON (for snapshot warnings column)
 */
public record FormulaEvaluationResult(
    Map<String, BigDecimal> outputs,
    JsonNode inputs,
    JsonNode warnings) {}
