package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DistrictVolumeCreateDto(@NotNull String area, // "INTERIOR" or "COASTAL"
    @NotNull @Future LocalDate startDate, // @Future = strictly after today; also checked in service
    @NotNull BigDecimal tableLevelFactor, BigDecimal heliMultiplier, // nullable; required when area
                                                                     // = "COASTAL" — validated in
                                                                     // service
    @NotNull @Valid TableDataDto tableData // polymorphic — "type" discriminator selects subtype
) {
}
