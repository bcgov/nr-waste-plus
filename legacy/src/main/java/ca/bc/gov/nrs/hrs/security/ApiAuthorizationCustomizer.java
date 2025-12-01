package ca.bc.gov.nrs.hrs.security;

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
 * <p>This customizer registers route-level authorization rules such as which
 * endpoints require authentication, which are permitted anonymously, and
 * custom access checks using {@link JwtRoleAuthorizationManagerFactory}.
 * </p>
 */
@Component
@RequiredArgsConstructor
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
        .permitAll()

        // Allow OPTIONS requests to be accessed with authentication
        .requestMatchers(HttpMethod.OPTIONS, "/**")
        .authenticated()

        // Allow unrestricted access to authenticated users
        .requestMatchers("/api/codes/**", "/api/search/**")
        .authenticated();

  }
}
