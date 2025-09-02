package ca.bc.gov.nrs.hrs.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import ca.bc.gov.nrs.hrs.dto.base.Role;
import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith(SpringExtension.class)
@DisplayName("Integration Test | Logged User Test")
@WithMockJwt(
    value = "BAGGINGS",
    cognitoGroups = {"Viewer", "Planner_00001012"},
    email = "bilbo.baggings@gov.bc.ca")
class LoggedUserHelperIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  LoggedUserHelper userAuthenticationHelper;

  @Test
  @DisplayName("hasConcreteRole returns true for matching concrete role")
  void testHasConcreteRole() {

    Assertions.assertFalse(userAuthenticationHelper.hasConcreteRole(Role.ADMIN));
  }

  @Test
  @DisplayName("hasAbstractRole returns true for matching abstract role with clientId")
  void testHasAbstractRole() {
    Assertions.assertTrue(userAuthenticationHelper.hasAbstractRole(Role.PLANNER, "00001012"));
  }

  @Test
  @DisplayName("hasAbstractRole returns true for matching abstract role with clientId")
  void testHasMatchRole() {
    Assertions.assertTrue(userAuthenticationHelper.hasRoleMatching(role -> role.endsWith("12")));
  }

  @Test
  @DisplayName("getLoggedUserEmail returns correct email")
  void shouldGetCorrectEmail() {
    assertEquals("bilbo.baggings@gov.bc.ca", userAuthenticationHelper.getLoggedUserEmail());
  }

  @Test
  @DisplayName("getLoggedUserId returns correct ID for IDIR user")
  void shouldGetCorrectUserId() {
    assertEquals("IDIR\\BAGGINGS", userAuthenticationHelper.getLoggedUserId());
  }

  @Test
  @DisplayName("isIdirUser returns true when provider is IDIR")
  void shouldReturnTrueIfIdirUser() {
    Assertions.assertTrue(userAuthenticationHelper.isIdirUser());
  }
}
