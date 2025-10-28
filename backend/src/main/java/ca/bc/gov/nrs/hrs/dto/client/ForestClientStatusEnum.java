package ca.bc.gov.nrs.hrs.dto.client;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

/**
 * Enum containing all forest client status codes and descriptions.
 *
 * <p>
 * Each enum constant exposes {@code code} and {@code description} properties
 * (via Lombok's {@link Getter}) and is serialized as a JSON object because
 * of {@link JsonFormat#shape()} usage. Individual JSON property names are
 * provided with {@link JsonProperty} annotations.
 * </p>
 */
@Getter
@JsonFormat(shape = JsonFormat.Shape.OBJECT)
public enum ForestClientStatusEnum {
  @JsonProperty("ACT")
  ACTIVE("ACT", "Active"),
  @JsonProperty("DAC")
  DEACTIVATED("DAC", "Deactivated"),
  @JsonProperty("DEC")
  DECEASED("DEC", "Deceased"),
  @JsonProperty("REC")
  RECEIVERSHIP("REC", "Receivership"),
  @JsonProperty("SPN")
  SUSPENDED("SPN", "Suspended");

  private final String code;
  private final String description;

  ForestClientStatusEnum(String code, String description) {
    this.code = code;
    this.description = description;
  }

  /**
   * Get a {@link ForestClientStatusEnum} instance given the status code.
   *
   * @param code the code to look up
   * @return the matching {@link ForestClientStatusEnum} or {@code null} if not found
   */
  public static ForestClientStatusEnum of(String code) {
    for (ForestClientStatusEnum status : values()) {
      if (status.code.equals(code)) {
        return status;
      }
    }
    return null;
  }
}
