package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.math.BigDecimal;

/**
 * Represents a single district row within a COASTAL dataset.
 *
 * <p>This DTO contains breakdown values for different coastal logging categories,
 * including avoidable and unavoidable volumes, as well as the computed total.</p>
 *
 * <p>Each row is identified by a district {@code code} and is used as part of the
 * hierarchical COASTAL table structure.</p>
 */
public record CoastDistrictRowDto(
    String code,
    BigDecimal avoidableSawlog,
    BigDecimal avoidableHembalGradeU,
    BigDecimal avoidableGradeY,
    BigDecimal unavoidable,
    BigDecimal total
) {}