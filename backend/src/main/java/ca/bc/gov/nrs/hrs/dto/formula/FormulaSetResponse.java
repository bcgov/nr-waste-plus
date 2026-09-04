package ca.bc.gov.nrs.hrs.dto.formula;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import java.time.LocalDate;
import java.util.List;

/** Formula-set representation returned by the API. */
public record FormulaSetResponse(Long id, Area area, LocalDate startDate, LocalDate endDate,
    boolean deleted, List<FormulaItemDto> formulas) {}
