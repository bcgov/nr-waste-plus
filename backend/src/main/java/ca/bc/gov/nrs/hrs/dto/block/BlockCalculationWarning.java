package ca.bc.gov.nrs.hrs.dto.block;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Typed warning emitted during block calculation. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BlockCalculationWarning(String code, String message) {}
