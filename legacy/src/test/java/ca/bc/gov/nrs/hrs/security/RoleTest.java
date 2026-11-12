package ca.bc.gov.nrs.hrs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.dto.base.RoleType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Unit Test | Role Enum")
class RoleTest {

  @Test
  @DisplayName("Role types should be correctly assigned")
  void testRoleTypes() {
    assertEquals(RoleType.ABSTRACT, Role.VIEWER.getType(), "VIEWER should be ABSTRACT");
    assertEquals(RoleType.ABSTRACT, Role.SUBMITTER.getType(), "SUBMITTER should be ABSTRACT");
    assertEquals(RoleType.CONCRETE, Role.AREA.getType(), "AREA should be CONCRETE");
    assertEquals(RoleType.CONCRETE, Role.DISTRICT.getType(), "DISTRICT should be CONCRETE");
    assertEquals(RoleType.CONCRETE, Role.ADMIN.getType(), "ADMIN should be CONCRETE");
  }

  @Test
  @DisplayName("Abstract roles should return true for isAbstract()")
  void testIsAbstract() {
    assertTrue(Role.VIEWER.isAbstract(), "VIEWER should be abstract");
    assertTrue(Role.SUBMITTER.isAbstract(), "SUBMITTER should be abstract");
    assertFalse(Role.AREA.isAbstract(), "AREA should not be abstract");
    assertFalse(Role.DISTRICT.isAbstract(), "DISTRICT should not be abstract");
    assertFalse(Role.ADMIN.isAbstract(), "ADMIN should not be abstract");
  }

  @Test
  @DisplayName("Concrete roles should return true for isConcrete()")
  void testIsConcrete() {
    assertFalse(Role.VIEWER.isConcrete(), "VIEWER should not be concrete");
    assertFalse(Role.SUBMITTER.isConcrete(), "SUBMITTER should not be concrete");
    assertTrue(Role.AREA.isConcrete(), "AREA should be concrete");
    assertTrue(Role.DISTRICT.isConcrete(), "DISTRICT should be concrete");
    assertTrue(Role.ADMIN.isConcrete(), "ADMIN should be concrete");
  }

  @Test
  @DisplayName("Role lookup should accept enum and authority names case-insensitively")
  void testFromValue() {
    assertEquals(Role.VIEWER, Role.fromValue("viewer"));
    assertEquals(Role.VIEWER, Role.fromValue("waste_plus_viewer"));
    assertEquals(Role.ADMIN, Role.fromValue("WASTE_PLUS_ADMIN"));
  }

  @Test
  @DisplayName("Role lookup should return null for unknown values")
  void testFromValueReturnsNullForUnknownValue() {
    assertNull(Role.fromValue("UNKNOWN_ROLE"));
    assertNull(Role.fromValue(null));
  }
}
