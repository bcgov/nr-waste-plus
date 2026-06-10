package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import java.math.BigDecimal;

public record InteriorDistrictRowDto(
    String     code,
    BigDecimal avoidableSawlog,
    BigDecimal avoidableGrade4,
    BigDecimal unavoidableGrade4,
    BigDecimal total
) {}