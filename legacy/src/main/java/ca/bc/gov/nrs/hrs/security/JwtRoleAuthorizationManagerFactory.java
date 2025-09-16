package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Function;
import java.util.function.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtRoleAuthorizationManagerFactory {

  private final JwtRoleChecker roleChecker;

  public AuthorizationManager<RequestAuthorizationContext> gotRoleMatching(
      Predicate<String> matcher) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasRoleMatching(matcher));
  }

  public AuthorizationManager<RequestAuthorizationContext> gotRole(String role) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasRole(role));
  }

  public AuthorizationManager<RequestAuthorizationContext> gotAbstractRole(String rolePrefix,
      Function<HttpServletRequest, String> clientIdExtractor) {
    return (authSupplier, context) ->
        new AuthorizationDecision(
            roleChecker.hasAbstractRole(rolePrefix, clientIdExtractor.apply(context.getRequest()))
        );
  }

  public AuthorizationManager<RequestAuthorizationContext> gotIdp(String provider) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasIdpProvider(provider));
  }

  public AuthorizationManager<RequestAuthorizationContext> gotIdp(IdentityProvider provider) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasIdpProvider(provider));
  }
}