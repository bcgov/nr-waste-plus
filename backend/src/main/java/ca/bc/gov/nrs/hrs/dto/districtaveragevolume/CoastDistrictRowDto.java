package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.math.BigDecimal;

public record CoastDistrictRowDto(
    String     code,
    BigDecimal avoidableSawlog,
    BigDecimal avoidableHembalGradeU,
    BigDecimal avoidableGradeY,
    BigDecimal unavoidable,
    BigDecimal total
) {}