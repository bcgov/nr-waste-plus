package ca.bc.gov.nrs.hrs.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.extensions.AbstractTestContainerIntegrationTest;
import ca.bc.gov.nrs.hrs.extensions.WithMockJwt;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@DisplayName("Integrated Test | Jwt Role Checker")
class JwtRoleCheckerIntegrationTest extends AbstractTestContainerIntegrationTest {

  @Autowired
  JwtRoleChecker checker;

  @Test
  @WithMockJwt(cognitoGroups = {"Viewer"})
  void testHasConcreteRole_shouldReturnTrue() {
    assertTrue(checker.hasConcreteRole("Viewer"));
  }

  @Test
  @WithMockJwt(cognitoGroups = {"Approver_12345678"})
  void testHasAbstractRole_shouldReturnTrue() {
    assertTrue(checker.hasAbstractRole("Approver", "12345678"));
  }

  @Test
  @WithMockJwt(cognitoGroups = {"Approver_12345678"})
  void testHasRole_shouldMatchPrefix() {
    assertTrue(checker.hasRole("Approver"));
    assertTrue(checker.hasRole("Approver_12345678"));
    assertFalse(checker.hasRole("Viewer"));
  }

  @Test
  void testHasRole_shouldRejectRoleContainedInUnrelatedAuthority() {
    Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
        "user", "", AuthorityUtils.createAuthorityList("ROLE_SUPER_APPROVER"));
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);

    assertFalse(new JwtRoleChecker().hasRole("Approver"));
  }

  @Test
  @WithMockJwt(idp = "idir")
  void testHasIdpProvider_shouldMatch() {
    assertTrue(checker.hasIdpProvider("idir"));
  }

  @Test
  void testHasRoleMatching_shouldReturnFalseWhenUnauthenticated() {
    // Clear the context to simulate no authentication
    SecurityContextHolder.clearContext();

    JwtRoleChecker checker = new JwtRoleChecker();
    boolean result = checker.hasRoleMatching(role -> role.equalsIgnoreCase("Viewer"));

    assertFalse(result);
  }

  @Test
  void testHasRoleMatching_shouldReturnFalseWhenAuthenticationIsNotAuthenticated() {
    Authentication authentication = mock(Authentication.class);
    when(authentication.isAuthenticated()).thenReturn(false);
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);

    assertFalse(new JwtRoleChecker().hasRoleMatching(role -> true));
  }

  @Test
  void testGetJwt_shouldThrowExceptionWhenPrincipalIsNotJwt() {
    Authentication auth = mock(Authentication.class);
    when(auth.getPrincipal()).thenReturn("not-a-jwt");

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(auth);
    SecurityContextHolder.setContext(context);

    JwtRoleChecker checker = new JwtRoleChecker();

    assertThrows(IllegalStateException.class, () -> checker.hasIdpProvider("idir"));
  }

  @Test
  void testGetJwt_shouldThrowExceptionWhenAuthenticationIsMissing() {
    SecurityContextHolder.setContext(SecurityContextHolder.createEmptyContext());

    assertThrows(IllegalStateException.class, () -> checker.hasIdpProvider("idir"));
  }


}
