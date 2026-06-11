package ca.bc.gov.nrs.hrs.dto.districtaveragevolume;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Polymorphic root interface for district volume table structures.
 *
 * <p>This interface represents the root of a sealed hierarchy used to model
 * area-specific table layouts for District Volume data.</p>
 *
 * <p>Jackson polymorphism is enabled via a "type" discriminator property,
 * allowing automatic serialization and deserialization of concrete implementations
 * based on their logical area type.</p>
 *
 * <p>Supported subtypes:</p>
 * <ul>
 *   <li>{@link InteriorDataDto} mapped to "INTERIOR"</li>
 *   <li>{@link CoastDataDto} mapped to "COASTAL"</li>
 * </ul>
 *
 * <p>The sealed nature of this interface ensures compile-time exhaustiveness
 * when handling all possible table structures.</p>
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = InteriorDataDto.class, name = "INTERIOR"),
    @JsonSubTypes.Type(value = CoastDataDto.class, name = "COASTAL")
})
public sealed interface TableDataDto
    permits InteriorDataDto, CoastDataDto {
}