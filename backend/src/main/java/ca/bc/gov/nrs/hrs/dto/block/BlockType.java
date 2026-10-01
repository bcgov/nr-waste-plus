package ca.bc.gov.nrs.hrs.dto.block;

import java.util.Optional;

/** Submission block type category. */
public enum BlockType {
  DISTRICT_AVERAGE;

  /**
   * Resolves a raw string value to the matching {@link BlockType} enum constant.
   *
   * @param value the raw string value
   * @return an Optional containing the matching BlockType, or empty if no match
   */
  public static Optional<BlockType> from(String value) {
    if (value == null) {
      return Optional.empty();
    }
    try {
      return Optional.of(valueOf(value.trim()));
    } catch (IllegalArgumentException e) {
      return Optional.empty();
    }
  }
}
