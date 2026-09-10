package ca.bc.gov.nrs.hrs.dto.formula;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Formula row in a formula-set request or response. */
public record FormulaItemDto(@NotBlank String formulaKey, @NotBlank String expression,
    @NotNull @Min(0) Integer sortOrder) {}
