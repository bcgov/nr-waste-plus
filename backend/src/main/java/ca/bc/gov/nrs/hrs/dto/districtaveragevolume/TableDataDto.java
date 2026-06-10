package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(
    use     = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = InteriorDataDto.class, name = "INTERIOR"),
    @JsonSubTypes.Type(value = CoastDataDto.class,    name = "COASTAL")
})
public sealed interface TableDataDto
    permits InteriorDataDto, CoastDataDto {}