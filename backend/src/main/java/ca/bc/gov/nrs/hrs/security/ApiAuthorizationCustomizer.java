package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.dto.base.IdentityProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.stereotype.Component;

/**
 * API authorization configuration: defines security rules for HTTP routes.
 *
 * <p>
 * This customizer registers route-level authorization rules such as which
 * endpoints require authentication, which are permitted anonymously, and
 * custom access checks using {@link JwtRoleAuthorizationManagerFactory}.
 * </p>
 */
@RequiredArgsConstructor
@Component
public class ApiAuthorizationCustomizer implements
    Customizer<
        AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry
        > {


  private final JwtRoleAuthorizationManagerFactory roleCheck;

  /**
   * The environment of the application, which is injected from the application properties. The
   * default value is "PROD".
   */
  @Value("${ca.bc.gov.nrs.environment:PROD}")
  String environment;

  @Override
  public void customize(
      AuthorizeHttpRequestsConfigurer<HttpSecurity>
          .AuthorizationManagerRequestMatcherRegistry authorize
  ) {

    authorize
        // Allow actuator endpoints to be accessed without authentication
        .requestMatchers(HttpMethod.GET, "/metrics", "/health")
        .permitAll();

    authorize
        // Allow OPTIONS requests to be accessed with authentication
        .requestMatchers(HttpMethod.OPTIONS, "/**")
        .authenticated()

        // User Preferences can be accessed by authenticated users
        .requestMatchers("/api/users/preferences")
        .authenticated()

        // Codes can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/codes/**")
        .authenticated()

        // Clients request should be accessed by users with BUSINESS_BCEID identity provider only
        .requestMatchers("/api/forest-clients/clients")
        .access(roleCheck.gotIdp(IdentityProvider.BUSINESS_BCEID))

        // Forest Clients can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/forest-clients/**")
        .authenticated()


        // Search reporting units can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/search/**")
        .authenticated()

        // Deny all other requests
        .anyRequest().denyAll();

  }
}
