package ca.bc.gov.nrs.hrs.dto.base;

import lombok.With;

@With
public record CodeNameDto(
    String code,
    String name
) {

}
