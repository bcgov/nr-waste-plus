package ca.bc.gov.nrs.hrs.dto.formula;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import java.time.Instant;
import java.time.LocalDate;

/** Lightweight formula-set representation for collection results. */
public record FormulaSetListItemDto(
    Long id,
    Area area,
    LocalDate startDate,
    LocalDate endDate,
    boolean deleted,
    long formulaCount,
    Instant createdAt,
    Instant updatedAt) {}
