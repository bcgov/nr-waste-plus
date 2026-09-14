package ca.bc.gov.nrs.hrs.dto.base;

/**
 * Enum representing the two types of roles in the system.
 *
 * <ul>
 *   <li>CONCRETE: Role names that stand alone (e.g., "ADMIN").
 *   <li>ABSTRACT: Role names that are intended to be combined with a client identifier (for example
 *       "PLANNER_00001012").
 * </ul>
 */
public enum RoleType {
  CONCRETE,
  ABSTRACT
}
