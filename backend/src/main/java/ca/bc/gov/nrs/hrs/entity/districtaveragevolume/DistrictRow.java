package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DistrictRow(
    String     code,
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
