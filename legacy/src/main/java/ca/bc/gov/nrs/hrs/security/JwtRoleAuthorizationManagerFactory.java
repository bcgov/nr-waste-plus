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

/**
 * Factory for creating {@link AuthorizationManager} instances that evaluate
 * role- and identity-provider-based decisions using {@link JwtRoleChecker}.
 *
 * <p>The factory methods return AuthorizationManager lambdas that can be used
 * in security configuration to enforce role and provider checks per request.
 * </p>
 */
@Component
@RequiredArgsConstructor
public class JwtRoleAuthorizationManagerFactory {

  private final JwtRoleChecker roleChecker;

  /**
   * Create an AuthorizationManager that checks roles using an arbitrary
   * predicate.
   *
   * @param matcher predicate applied to authority strings
   * @return an AuthorizationManager for request contexts
   */
  public AuthorizationManager<RequestAuthorizationContext> gotRoleMatching(
      Predicate<String> matcher) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasRoleMatching(matcher));
  }

  /**
   * Create an AuthorizationManager that checks for a concrete role.
   *
   * @param role the role to check
   * @return an AuthorizationManager for request contexts
   */
  public AuthorizationManager<RequestAuthorizationContext> gotRole(String role) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasRole(role));
  }

  /**
   * Create an AuthorizationManager that checks for an abstract role
   * constructed from a prefix and a client id extracted from the request.
   *
   * @param rolePrefix the role prefix (e.g. PLANNER)
   * @param clientIdExtractor function to extract client id from the request
   * @return an AuthorizationManager for request contexts
   */
  public AuthorizationManager<RequestAuthorizationContext> gotAbstractRole(String rolePrefix,
      Function<HttpServletRequest, String> clientIdExtractor) {
    return (authSupplier, context) ->
        new AuthorizationDecision(
            roleChecker.hasAbstractRole(rolePrefix, clientIdExtractor.apply(context.getRequest()))
        );
  }

  /**
   * Create an AuthorizationManager that checks the identity provider from a
   * string claim value.
   *
   * @param provider provider claim string
   * @return an AuthorizationManager for request contexts
   */
  public AuthorizationManager<RequestAuthorizationContext> gotIdp(String provider) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasIdpProvider(provider));
  }

  /**
   * Create an AuthorizationManager that checks the identity provider using
   * an enum value.
   *
   * @param provider the identity provider enum to check
   * @return an AuthorizationManager for request contexts
   */
  public AuthorizationManager<RequestAuthorizationContext> gotIdp(IdentityProvider provider) {
    return (authSupplier, context) ->
        new AuthorizationDecision(roleChecker.hasIdpProvider(provider));
  }
}