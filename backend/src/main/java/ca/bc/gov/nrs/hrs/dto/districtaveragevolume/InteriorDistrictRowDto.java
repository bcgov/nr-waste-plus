package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.math.BigDecimal;

/**
 * Represents a single district row within an INTERIOR dataset.
 *
 * <p>This DTO contains volume values for the interior-specific categories,
 * including avoidable and unavoidable Grade 4 volumes, as well as the
 * computed total.
 *
 * <p>Each row is identified by a district {@code code} and is used as part
 * of the hierarchical INTERIOR table structure.
 */
public record InteriorDistrictRowDto(
    String code,
    BigDecimal avoidableSawlog,
    BigDecimal avoidableGrade4,
    BigDecimal unavoidableGrade4,
    BigDecimal total
) {}