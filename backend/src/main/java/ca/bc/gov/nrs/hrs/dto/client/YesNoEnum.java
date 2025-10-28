package ca.bc.gov.nrs.hrs.dto.client;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Simple enum representing a yes/no flag using single-character codes
 * "Y" and "N".
 *
 * <p>
 * The enum exposes a {@link #value()} method annotated with {@link JsonValue}
 * so instances are serialized as their single-character codes. A static
 * {@link #fromValue(String)} factory annotated with {@link JsonCreator}
 * supports deserialization from those codes (case-insensitive).
 * </p>
 */
public enum YesNoEnum {
  YES("Y"),
  NO("N");

  private final String value;

  YesNoEnum(String value) {
    this.value = value;
  }

  @JsonValue
  public String value() {
    return this.value;
  }

  @JsonCreator
  public static YesNoEnum fromValue(String value) {
    for (YesNoEnum c : values()) {
      if (c.value().equalsIgnoreCase(value)) {
        return c;
      }
    }
    return null;
  }
}
