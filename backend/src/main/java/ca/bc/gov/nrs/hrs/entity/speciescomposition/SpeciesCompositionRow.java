package ca.bc.gov.nrs.hrs.entity.speciescomposition;

import ca.bc.gov.nrs.hrs.dto.base.CodeDescriptionDto;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SpeciesCompositionRow(
    CodeDescriptionDto district,
    BigDecimal balsam, BigDecimal cedar, BigDecimal cottonwood,
    BigDecimal cypress, BigDecimal fir, BigDecimal hemlock,
    BigDecimal larch, BigDecimal maple, BigDecimal pine,
    BigDecimal poplar, BigDecimal redcedar, BigDecimal redwood,
    BigDecimal spruce, BigDecimal whitebirch, BigDecimal whitepine,
    BigDecimal yew, BigDecimal other, BigDecimal unknown, BigDecimal total
) {}