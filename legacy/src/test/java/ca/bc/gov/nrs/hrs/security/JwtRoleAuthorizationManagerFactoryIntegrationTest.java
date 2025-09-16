package ca.bc.gov.nrs.hrs.security;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Predicate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

@DisplayName("Unit Test | Jwt Role Authorization Manager Factory")
@ExtendWith(MockitoExtension.class)
class JwtRoleAuthorizationManagerFactoryIntegrationTest {

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

  @Test
  void testGotRoleMatching_shouldDelegateToChecker() {
    Predicate<String> matcher = role -> role.equalsIgnoreCase("Viewer");
    when(roleChecker.hasRoleMatching(matcher)).thenReturn(true);

    AuthorizationManager<RequestAuthorizationContext> manager = factory.gotRoleMatching(matcher);
    AuthorizationDecision decision = manager.check(() -> null, context);

    assertTrue(decision.isGranted());
    verify(roleChecker).hasRoleMatching(matcher);
  }

  @Test
  void testGotRole_shouldDelegateToChecker() {
    when(roleChecker.hasRole("Viewer")).thenReturn(true);

    AuthorizationManager<RequestAuthorizationContext> manager = factory.gotRole("Viewer");
    AuthorizationDecision decision = manager.check(() -> null, context);

    assertTrue(decision.isGranted());
    verify(roleChecker).hasRole("Viewer");
  }

  @Test
  void testGotAbstractRole_shouldExtractClientIdAndDelegate() {
    when(request.getHeader("X-Client-Id")).thenReturn("12345678");
    when(roleChecker.hasAbstractRole("Approver", "12345678")).thenReturn(true);

    AuthorizationManager<RequestAuthorizationContext> manager =
        factory.gotAbstractRole("Approver", req -> req.getHeader("X-Client-Id"));

    AuthorizationDecision decision = manager.check(() -> null, context);

    assertTrue(decision.isGranted());
    verify(roleChecker).hasAbstractRole("Approver", "12345678");
  }

  @Test
  void testGotIdp_shouldDelegateToCheckerWithString() {
    when(roleChecker.hasIdpProvider("idir")).thenReturn(true);

    AuthorizationManager<RequestAuthorizationContext> manager = factory.gotIdp("idir");
    AuthorizationDecision decision = manager.check(() -> null, context);

    assertTrue(decision.isGranted());
    verify(roleChecker).hasIdpProvider("idir");
  }

  @Test
  void testGotIdp_shouldDelegateToCheckerWithIdentityProvider() {
    IdentityProvider provider = IdentityProvider.IDIR;
    when(roleChecker.hasIdpProvider(provider)).thenReturn(true);

    AuthorizationManager<RequestAuthorizationContext> manager = factory.gotIdp(provider);
    AuthorizationDecision decision = manager.check(() -> null, context);

    assertTrue(decision.isGranted());
    verify(roleChecker).hasIdpProvider(provider);
  }
}
