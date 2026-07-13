package ca.bc.gov.nrs.hrs.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import ca.bc.gov.nrs.hrs.dto.base.Role;
import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Predicate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.authorization.AuthorizationResult;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

@DisplayName("Unit Test | JwtRoleAuthorizationManagerFactory")
@ExtendWith(MockitoExtension.class)
class JwtRoleAuthorizationManagerFactoryTest {

  @Mock
  JwtRoleChecker roleChecker;

  @Mock
  HttpServletRequest request;

  JwtRoleAuthorizationManagerFactory factory;
  RequestAuthorizationContext context;

  @BeforeEach
  void setup() {
    factory = new JwtRoleAuthorizationManagerFactory(roleChecker);
    context = new RequestAuthorizationContext(request);
  }

  // ── gotRoleMatching(Predicate) ───────────────────────────────────────────

  @Nested
  @DisplayName("gotRoleMatching(Predicate)")
  class GotRoleMatchingPredicate {

    @Test
    @DisplayName("should grant access when predicate matches")
    void shouldGrantWhenPredicateMatches() {
      Predicate<String> matcher = role -> role.equalsIgnoreCase("Viewer");
      when(roleChecker.hasRoleMatching(matcher)).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager = factory.gotRoleMatching(matcher);
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
      verify(roleChecker).hasRoleMatching(matcher);
    }

    @Test
    @DisplayName("should deny access when predicate does not match")
    void shouldDenyWhenPredicateDoesNotMatch() {
      Predicate<String> matcher = role -> role.equalsIgnoreCase("Admin");
      when(roleChecker.hasRoleMatching(matcher)).thenReturn(false);

      AuthorizationManager<RequestAuthorizationContext> manager = factory.gotRoleMatching(matcher);
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertFalse(result.isGranted());
      verify(roleChecker).hasRoleMatching(matcher);
    }
  }

  // ── gotRoleMatching(Role...) ─────────────────────────────────────────────

  @Nested
  @DisplayName("gotRoleMatching(Role...)")
  class GotRoleMatchingRoles {

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("should grant access when checker matches a single role")
    void shouldGrantForSingleMatchingRole() {
      when(roleChecker.hasRoleMatching(any(Predicate.class))).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotRoleMatching(Role.VIEWER);
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("should grant access when checker matches one of multiple roles")
    void shouldGrantForOneOfMultipleRoles() {
      when(roleChecker.hasRoleMatching(any(Predicate.class))).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotRoleMatching(Role.VIEWER, Role.ADMIN);
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("should deny access when checker does not match any role")
    void shouldDenyWhenNoRoleMatches() {
      when(roleChecker.hasRoleMatching(any(Predicate.class))).thenReturn(false);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotRoleMatching(Role.ADMIN, Role.DISTRICT);
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertFalse(result.isGranted());
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("built predicate should match role by prefix (startsWith)")
    void predicateShouldMatchByPrefix() {
      // Capture the predicate passed to roleChecker
      ArgumentCaptor<Predicate<String>> captor = ArgumentCaptor.forClass(Predicate.class);
      when(roleChecker.hasRoleMatching(captor.capture())).thenReturn(true);

      factory.gotRoleMatching(Role.VIEWER).authorize(() -> null, context);

      Predicate<String> builtPredicate = captor.getValue();
      assertNotNull(builtPredicate);

      // The predicate upper-cases the input and checks startsWith against role name
      assertTrue(builtPredicate.test("WASTE_PLUS_VIEWER"),
          "Should match exact role name");
      assertTrue(builtPredicate.test("waste_plus_viewer"),
          "Should match case-insensitively");
      assertTrue(builtPredicate.test("WASTE_PLUS_VIEWER_12345"),
          "Should match role name as prefix");
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("built predicate should not match unrelated role")
    void predicateShouldNotMatchUnrelatedRole() {
      ArgumentCaptor<Predicate<String>> captor = ArgumentCaptor.forClass(Predicate.class);
      when(roleChecker.hasRoleMatching(captor.capture())).thenReturn(false);

      factory.gotRoleMatching(Role.VIEWER).authorize(() -> null, context);

      Predicate<String> builtPredicate = captor.getValue();
      assertNotNull(builtPredicate);

      assertFalse(builtPredicate.test("WASTE_PLUS_ADMIN"),
          "Should not match a different role");
      assertFalse(builtPredicate.test("SOME_OTHER_ROLE"),
          "Should not match unrelated role");
    }

    @SuppressWarnings("unchecked")
    @Test
    @DisplayName("built predicate should match any of the supplied roles")
    void predicateShouldMatchAnySuppliedRole() {
      ArgumentCaptor<Predicate<String>> captor = ArgumentCaptor.forClass(Predicate.class);
      when(roleChecker.hasRoleMatching(captor.capture())).thenReturn(true);

      factory.gotRoleMatching(Role.VIEWER, Role.ADMIN).authorize(() -> null, context);

      Predicate<String> builtPredicate = captor.getValue();
      assertNotNull(builtPredicate);

      assertTrue(builtPredicate.test("WASTE_PLUS_VIEWER"),
          "Should match first role");
      assertTrue(builtPredicate.test("WASTE_PLUS_ADMIN"),
          "Should match second role");
      assertFalse(builtPredicate.test("WASTE_PLUS_SUBMITTER"),
          "Should not match role not in the list");
    }
  }

  // ── gotRole(String) ─────────────────────────────────────────────────────

  @Nested
  @DisplayName("gotRole(String)")
  class GotRole {

    @Test
    @DisplayName("should grant access when role matches")
    void shouldGrantWhenRoleMatches() {
      when(roleChecker.hasRole("Viewer")).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager = factory.gotRole("Viewer");
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
      verify(roleChecker).hasRole("Viewer");
    }

    @Test
    @DisplayName("should deny access when role does not match")
    void shouldDenyWhenRoleDoesNotMatch() {
      when(roleChecker.hasRole("Viewer")).thenReturn(false);

      AuthorizationManager<RequestAuthorizationContext> manager = factory.gotRole("Viewer");
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertFalse(result.isGranted());
      verify(roleChecker).hasRole("Viewer");
    }
  }

  // ── gotAbstractRole ──────────────────────────────────────────────────────

  @Nested
  @DisplayName("gotAbstractRole(String, Function)")
  class GotAbstractRole {

    @Test
    @DisplayName("should grant access when abstract role matches")
    void shouldGrantWhenAbstractRoleMatches() {
      when(request.getHeader("X-Client-Id")).thenReturn("12345678");
      when(roleChecker.hasAbstractRole("Approver", "12345678")).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotAbstractRole("Approver", req -> req.getHeader("X-Client-Id"));
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
      verify(roleChecker).hasAbstractRole("Approver", "12345678");
    }

    @Test
    @DisplayName("should deny access when abstract role does not match")
    void shouldDenyWhenAbstractRoleDoesNotMatch() {
      when(request.getHeader("X-Client-Id")).thenReturn("99999999");
      when(roleChecker.hasAbstractRole("Approver", "99999999")).thenReturn(false);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotAbstractRole("Approver", req -> req.getHeader("X-Client-Id"));
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertFalse(result.isGranted());
      verify(roleChecker).hasAbstractRole("Approver", "99999999");
    }

    @Test
    @DisplayName("should pass null client id when extractor returns null")
    void shouldHandleNullClientId() {
      when(request.getHeader("X-Client-Id")).thenReturn(null);
      when(roleChecker.hasAbstractRole("Approver", null)).thenReturn(false);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotAbstractRole("Approver", req -> req.getHeader("X-Client-Id"));
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertFalse(result.isGranted());
      verify(roleChecker).hasAbstractRole("Approver", null);
    }

    @Test
    @DisplayName("should use path variable as client id extractor")
    void shouldUsePathVariableExtractor() {
      when(request.getParameter("clientId")).thenReturn("ABC123");
      when(roleChecker.hasAbstractRole("Planner", "ABC123")).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotAbstractRole("Planner", req -> req.getParameter("clientId"));
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
      verify(roleChecker).hasAbstractRole("Planner", "ABC123");
    }
  }

  // ── gotIdp(String) ──────────────────────────────────────────────────────

  @Nested
  @DisplayName("gotIdp(String)")
  class GotIdpString {

    @Test
    @DisplayName("should grant access when idp string matches")
    void shouldGrantWhenIdpMatches() {
      when(roleChecker.hasIdpProvider("idir")).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager = factory.gotIdp("idir");
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
      verify(roleChecker).hasIdpProvider("idir");
    }

    @Test
    @DisplayName("should deny access when idp string does not match")
    void shouldDenyWhenIdpDoesNotMatch() {
      when(roleChecker.hasIdpProvider("bceid")).thenReturn(false);

      AuthorizationManager<RequestAuthorizationContext> manager = factory.gotIdp("bceid");
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertFalse(result.isGranted());
      verify(roleChecker).hasIdpProvider("bceid");
    }
  }

  // ── gotIdp(IdentityProvider) ─────────────────────────────────────────────

  @Nested
  @DisplayName("gotIdp(IdentityProvider)")
  class GotIdpEnum {

    @Test
    @DisplayName("should grant access when IdentityProvider matches")
    void shouldGrantWhenProviderMatches() {
      when(roleChecker.hasIdpProvider(IdentityProvider.IDIR)).thenReturn(true);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotIdp(IdentityProvider.IDIR);
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertTrue(result.isGranted());
      verify(roleChecker).hasIdpProvider(IdentityProvider.IDIR);
    }

    @Test
    @DisplayName("should deny access when IdentityProvider does not match")
    void shouldDenyWhenProviderDoesNotMatch() {
      when(roleChecker.hasIdpProvider(IdentityProvider.BUSINESS_BCEID)).thenReturn(false);

      AuthorizationManager<RequestAuthorizationContext> manager =
          factory.gotIdp(IdentityProvider.BUSINESS_BCEID);
      AuthorizationResult result = manager.authorize(() -> null, context);

      assertFalse(result.isGranted());
      verify(roleChecker).hasIdpProvider(IdentityProvider.BUSINESS_BCEID);
    }

    @Test
    @DisplayName("should delegate each IdentityProvider enum value correctly")
    void shouldDelegateAllProviders() {
      for (IdentityProvider provider : IdentityProvider.values()) {
        when(roleChecker.hasIdpProvider(provider)).thenReturn(true);

        AuthorizationManager<RequestAuthorizationContext> manager = factory.gotIdp(provider);
        AuthorizationResult result = manager.authorize(() -> null, context);

        assertTrue(result.isGranted(),
            "Should grant access for provider " + provider.name());
        verify(roleChecker).hasIdpProvider(provider);
      }
    }
  }
}

