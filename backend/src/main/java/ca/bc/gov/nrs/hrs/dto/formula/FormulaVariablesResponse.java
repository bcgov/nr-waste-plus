package ca.bc.gov.nrs.hrs.dto.formula;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Response from the formula variables endpoint providing three complementary
 * representations of available variables for a given effective date and area.
 *
 * @param effectiveDate the date for which variable values are resolved
 * @param area          the geographic area (INTERIOR or COASTAL)
 * @param namespaces    nested tree with resolved values for autocomplete UIs
 * @param flat          backward-compatible flat map of dotted path → value
 * @param schema        structure-only metadata (cacheable, changes ~1/year)
 * @param catalog       all grammar-approved namespaces and authoring-time values
 */
public record FormulaVariablesResponse(
    LocalDate effectiveDate,
    Area area,
    Map<String, VariableNodeDto> namespaces,
    Map<String, BigDecimal> flat,
    JsonNode schema,
    List<FormulaNamespaceCatalogDto> catalog
) {}
