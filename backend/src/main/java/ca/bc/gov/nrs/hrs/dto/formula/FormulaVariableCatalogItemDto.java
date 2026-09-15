package ca.bc.gov.nrs.hrs.dto.formula;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

/** A grammar-approved formula variable and its authoring-time value, when available. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FormulaVariableCatalogItemDto(String path, String label, BigDecimal value) {}
