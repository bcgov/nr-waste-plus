package ca.bc.gov.nrs.hrs.dto.client;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

/**
 * Enum containing all forest client type codes and their descriptions.
 * <p>
 * Each enum constant exposes a {@code code} and {@code description} and is
 * serialized as a JSON object due to {@link JsonFormat#shape()}.
 * </p>
 */
@Getter
@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum ForestClientTypeEnum {
  @JsonProperty("A")
  ASSOCIATION('A', "Association"),
  @JsonProperty("B")
  FIRST_NATION_BAND('B', "First Nation Band"),
  @JsonProperty("C")
  CORPORATION('C', "Corporation"),
  @JsonProperty("F")
  MINISTRY_OF_FORESTS_AND_RANGE('F', "Ministry of Forests and Range"),
  @JsonProperty("G")
  GOVERNMENT('G', "Government"),
  @JsonProperty("I")
  INDIVIDUAL('I', "Individual"),
  @JsonProperty("L")
  LIMITED_PARTNERSHIP('L', "Limited Partnership"),
  @JsonProperty("P")
  GENERAL_PARTNERSHIP('P', "General Partnership"),
  @JsonProperty("R")
  FIRST_NATION_GROUP('R', "First Nation Group"),
  @JsonProperty("S")
  SOCIETY('S', "Society"),
  @JsonProperty("T")
  FIRST_NATION_TRIBAL_COUNCIL('T', "First Nation Tribal Council"),
  @JsonProperty("U")
  UNREGISTERED_COMPANY('U', "Unregistered Company");

  private final Character code;
  private final String description;

  ForestClientTypeEnum(Character code, String description) {
    this.code = code;
    this.description = description;
  }

  /**
   * Get a {@link ForestClientTypeEnum} instance given the type code.
   *
   * @param code the type code to look up
   * @return the matching {@link ForestClientTypeEnum} or {@code null} if not found
   */
  public static ForestClientTypeEnum of(Character code) {
    for (ForestClientTypeEnum type : values()) {
      if (type.code.equals(code)) {
        return type;
      }
    }
    return null;
  }
}
