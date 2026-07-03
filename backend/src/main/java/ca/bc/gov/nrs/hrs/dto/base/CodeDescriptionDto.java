package ca.bc.gov.nrs.hrs.dto.base;

import java.util.List;
import lombok.With;

/**
 * Data Transfer Object that pairs a code with its human-readable description.
 *
 * <p>Represents an immutable record used throughout the application to transport a code and its
 * corresponding description. Optionally includes a list of configured geographic areas associated
 * with the code.</p>
 *
 * @param code the code value (e.g., district code, status code)
 * @param description the human-readable description for the code
 * @param areas optional list of configured geographic areas for the code
 */
@With
public record CodeDescriptionDto(
    String code,
    String description,
    List<String> areas
) {

  /**
   * Convenience constructor that initializes areas to an empty list.
   *
   * @param code the code value
   * @param description the human-readable description for the code
   */
  public CodeDescriptionDto(String code, String description) {
    this(code, description, List.of());
  }
}
