package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.dto.base.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.stereotype.Component;

/**
 * API authorization configuration: defines security rules for HTTP routes.
 *
 * <p>This customizer registers route-level authorization rules such as which
 * endpoints require authentication, which are permitted anonymously, and custom
 * access checks using {@link JwtRoleAuthorizationManagerFactory}.</p>
 */
@RequiredArgsConstructor
@Component
public class ApiAuthorizationCustomizer
    implements
    Customizer<
        org.springframework.security.config.annotation.web.configurers
            .AuthorizeHttpRequestsConfigurer<HttpSecurity>
            .AuthorizationManagerRequestMatcherRegistry> {

  private final JwtRoleAuthorizationManagerFactory roleCheck;

  /**
   * The environment of the application, injected from application properties.
   * The default value is {@code PROD}.
   */
  @Value("${ca.bc.gov.nrs.environment:PROD}")
  String environment;

  /**
   * Configures HTTP authorization rules for the application.
   *
   * <p>Registers route-level authorization rules in the following priority
   * order:
   * <ul>
   *   <li>Public health endpoint ({@code GET /actuator/health}) — permitted to all</li>
   *   <li>Metrics endpoint — requires authentication</li>
   *   <li>OPTIONS requests — requires authentication</li>
   *   <li>User endpoints ({@code /api/users/**}) — requires authentication</li>
   *   <li>Codes endpoints ({@code /api/codes/**}) — requires authentication</li>
   *   <li>Forest client list ({@code /api/forest-clients/clients}) — requires
   *       Viewer or Submitter role</li>
   *   <li>All other forest client endpoints — requires authentication</li>
   *   <li>Search endpoints ({@code /api/search/**}) — requires authentication</li>
   *   <li>Reporting unit endpoints ({@code /api/reporting-units/**}) —
   *       requires authentication</li>
   * </ul>
   *
   * @param authorize the authorization manager request matcher registry to
   *     configure
   */
  @Override
  public void customize(
      org.springframework.security.config.annotation.web.configurers
          .AuthorizeHttpRequestsConfigurer<HttpSecurity>
          .AuthorizationManagerRequestMatcherRegistry authorize
  ) {
    authorize
        // Public health endpoint
        .requestMatchers(HttpMethod.GET, "/actuator/health")
        .permitAll()

        // Metrics endpoint should be protected
        .requestMatchers("/metrics")
        .authenticated()

        // Allow OPTIONS requests to be accessed with authentication
        .requestMatchers(HttpMethod.OPTIONS, "/**")
        .authenticated()

        // User endpoints (preferences and bookmarks) can be accessed by authenticated users
        .requestMatchers("/api/users/**")
        .authenticated()

        // Codes can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/codes/**")
        .authenticated()

        // Clients request should be accessed by users with Viewer or Submitter roles only
        .requestMatchers("/api/forest-clients/clients")
        .access(roleCheck.gotRoleMatching(Role.VIEWER, Role.SUBMITTER))

        // Forest Clients can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/forest-clients/**")
        .authenticated()

        // Search reporting units can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/search/**")
        .authenticated()

        .requestMatchers(HttpMethod.GET, "/api/reporting-units/**")
        .authenticated()

        .requestMatchers(HttpMethod.OPTIONS, "/api/reporting-units/**")
        .authenticated()

        .requestMatchers(HttpMethod.POST, "/api/reporting-units/**")
        .access(
            roleCheck.gotRoleMatching(Role.SUBMITTER, Role.AREA, Role.DISTRICT, Role.ADMIN))

        .requestMatchers("/api/configuration/**")
        .access(roleCheck.gotRoleMatching(Role.ADMIN));
  }
}
