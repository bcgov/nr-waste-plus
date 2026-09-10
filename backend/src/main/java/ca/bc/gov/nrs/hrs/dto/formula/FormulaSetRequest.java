package ca.bc.gov.nrs.hrs.dto.formula;

import ca.bc.gov.nrs.hrs.entity.districtaveragevolume.Area;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

/** Complete formula-set create/update payload. */
public record FormulaSetRequest(@NotNull Area area, @NotNull LocalDate startDate,
    @NotEmpty List<@Valid FormulaItemDto> formulas) {}
