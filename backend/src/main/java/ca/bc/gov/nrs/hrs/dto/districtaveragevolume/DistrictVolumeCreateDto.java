package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request DTO used to create a new District Volume configuration.
 *
 * <p>This DTO contains both metadata and a polymorphic table structure that defines
 * district-level volume data for either INTERIOR or COASTAL areas.
 *
 * <p>The {@code tableData} field is polymorphic and uses a Jackson "type"
 * discriminator to determine the correct subtype during
 * serialization/deserialization.
 *
 * <p>Validation rules:
 *
 * <ul>
 *   <li>{@code area} must be either "INTERIOR" or "COASTAL"
 *   <li>{@code startDate} must be strictly in the future (@Future and service-level
 *       check)
 *   <li>{@code heliMultiplier} is required when {@code area = "COASTAL"}
 *       (enforced in the service layer)
 * </ul>
 */
public record DistrictVolumeCreateDto(
    @NotNull String area, // "INTERIOR" or "COASTAL"
    @NotNull @Future LocalDate startDate, // strictly after today
    @NotNull BigDecimal tableLevelFactor,
    BigDecimal heliMultiplier, // required when area = "COASTAL" (validated in service)
    @NotNull @Valid TableDataDto tableData // polymorphic — "type" discriminator selects subtype
) {}