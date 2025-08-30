package ca.bc.gov.nrs.hrs.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.stereotype.Component;

/**
 * This class contains the configuration for API authorization. This is where our security rules are
 * defined.
 */
@Component
public class ApiAuthorizationCustomizer implements
    Customizer<
        AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry
        > {

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
        .requestMatchers(HttpMethod.GET, "/actuator/**")
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

        // Forest Clients can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/forest-clients/**")
        .authenticated()

        // Search reporting units can be accessed by authenticated users
        // This is added as a repeat of the above rule to allow future customization
        .requestMatchers("/api/search/reporting-units")
        .authenticated()

        // Deny all other requests
        .anyRequest().denyAll();

  }
}
