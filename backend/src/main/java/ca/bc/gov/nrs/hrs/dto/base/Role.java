package ca.bc.gov.nrs.hrs.dto.base;

import com.fasterxml.jackson.annotation.JsonCreator;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Enum representing all roles in the system, each associated with a {@link RoleType}.
 * <p>
 * Roles are used for authorization checks (for example in Spring Security
 * expressions such as @PreAuthorize) and are typed as ABSTRACT or CONCRETE via
 * the {@link RoleType} enum. The {@link #fromValue(String)} factory supports
 * case-insensitive deserialization from strings.
 * </p>
 */
@Getter
@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public enum Role {
  VIEWER(RoleType.ABSTRACT),
  SUBMITTER(RoleType.ABSTRACT),
  AREA(RoleType.CONCRETE),
  DISTRICT(RoleType.CONCRETE),
  ADMIN(RoleType.CONCRETE);

  private final RoleType type;

  /**
   * Checks if the role is of type CONCRETE.
   *
   * @return true if the role is concrete; false otherwise
   */
  public boolean isConcrete() {
    return type == RoleType.CONCRETE;
  }

  /**
   * Checks if the role is of type ABSTRACT.
   *
   * @return true if the role is abstract; false otherwise
   */
  public boolean isAbstract() {
    return type == RoleType.ABSTRACT;
  }

  /**
   * Factory method to create a Role from a string value.
   * <p>
   * This method performs a case-insensitive comparison to find a matching
   * enum constant. If no match is found, null is returned.
   * </p>
   *
   * @param value the string value to match
   * @return the corresponding Role, or null if no match is found
   */
  @JsonCreator
  public static Role fromValue(String value) {
    for (Role role : values()) {
      if (role.name().equalsIgnoreCase(value)) {
        return role;
      }
    }
    return null;
  }
}
