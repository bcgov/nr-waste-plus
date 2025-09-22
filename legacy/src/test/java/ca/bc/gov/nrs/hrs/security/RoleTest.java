package ca.bc.gov.nrs.hrs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
  @DisplayName("Concrete role should return true for isConcrete()")
  void testIsConcrete() {
    assertTrue(Role.VIEWER.isAbstract(), "VIEWER should be concrete");
    assertTrue(Role.SUBMITTER.isAbstract(), "SUBMITTER should not be concrete");
    assertFalse(Role.AREA.isAbstract(), "AREA should be concrete");
    assertFalse(Role.DISTRICT.isAbstract(), "DISTRICT should be concrete");
    assertFalse(Role.ADMIN.isAbstract(), "ADMIN should be concrete");
  }
}