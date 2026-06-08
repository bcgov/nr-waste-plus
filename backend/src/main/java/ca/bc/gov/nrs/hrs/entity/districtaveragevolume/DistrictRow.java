package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

/**
 * Represents a single district row within a district volume table.
 *
 * <p>The fields applicable to a row depend on the area:
 *
 * <ul>
 *   <li><strong>Interior</strong>: {@code avoidableGrade4} and
 *       {@code unavoidableGrade4}
 *   <li><strong>Coast</strong>: {@code avoidableHembalGradeU},
 *       {@code avoidableGradeY}, and {@code unavoidable}
 *   <li><strong>Common</strong>: {@code district}, {@code avoidableSawlog},
 *       and {@code total}
 * </ul>
 *
 * @param district district code and description
 * @param avoidableSawlog avoidable sawlog volume
 * @param avoidableGrade4 avoidable Grade 4 volume (interior only)
 * @param unavoidableGrade4 unavoidable Grade 4 volume (interior only)
 * @param avoidableHembalGradeU avoidable HemBal Grade U volume (coast only)
 * @param avoidableGradeY avoidable Grade Y volume (coast only)
 * @param unavoidable unavoidable volume (coast only)
 * @param total total volume for the district row
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DistrictRow(
    CodeDescriptionDto district,
    BigDecimal avoidableSawlog,

    // Interior-only
    BigDecimal avoidableGrade4,
    BigDecimal unavoidableGrade4,

    // Coast-only
    BigDecimal avoidableHembalGradeU,
    BigDecimal avoidableGradeY,
    BigDecimal unavoidable,

    // Common
    BigDecimal total
) {}