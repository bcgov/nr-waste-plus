package ca.bc.gov.nrs.hrs.dto.formula;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Formula row in a formula-set request or response.
 *
 * <p>Serialization contract: a formula row exposes only {@code formulaKey}, {@code expression},
 * and {@code sortOrder}. Save-time validation diagnostics and extracted variables
 * ({@code validationErrors}, {@code declaredVariables}) are persistence-internal state and are
 * deliberately never serialized on any response; validation failures surface synchronously as
 * HTTP 422 on create/update instead. Clients must treat those fields as absent.
 */
public record FormulaItemDto(
    @NotBlank String formulaKey, @NotBlank String expression, @NotNull @Min(0) Integer sortOrder) {}
