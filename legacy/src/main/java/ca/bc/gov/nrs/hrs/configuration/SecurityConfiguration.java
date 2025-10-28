package ca.bc.gov.nrs.hrs.configuration;

import ca.bc.gov.nrs.hrs.security.ApiAuthorizationCustomizer;
import ca.bc.gov.nrs.hrs.security.CsrfSecurityCustomizer;
import ca.bc.gov.nrs.hrs.security.HeadersSecurityCustomizer;
import ca.bc.gov.nrs.hrs.security.Oauth2SecurityCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security configuration for the application.
 *
 * <p>This configuration registers the primary {@link SecurityFilterChain} bean
 * which composes security settings using several application-provided customizers:
 * {@code HeadersSecurityCustomizer}, {@code CsrfSecurityCustomizer},
 * {@code ApiAuthorizationCustomizer} and {@code Oauth2SecurityCustomizer}. The chain disables HTTP
 * Basic and form login and enables CORS with default settings.</p>
 *
 * @since 1.0.0
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {

  /**
   * Configure and build the primary {@link SecurityFilterChain} for the app.
   *
   * <p>The supplied customizers are applied in the following logical order:
   * headers -> CSRF -> CORS defaults -> authorization rules -> disable HTTP Basic and form login ->
   * OAuth2 resource server. Each argument is a Spring-managed component that encapsulates the
   * configuration for the corresponding concern.</p>
   *
   * @param http              the {@link HttpSecurity} builder provided by Spring Security
   * @param headersCustomizer customizer used to configure security-related HTTP headers
   * @param csrfCustomizer    customizer used to configure CSRF protection
   * @param apiCustomizer     customizer used to configure authorization rules for HTTP endpoints
   * @param oauth2Customizer  customizer used to configure OAuth2 resource server support
   * @return the configured {@link SecurityFilterChain}
   * @throws Exception if an error occurs while configuring {@code HttpSecurity}
   */
  @Bean
  public SecurityFilterChain filterChain(
      HttpSecurity http,
      HeadersSecurityCustomizer headersCustomizer,
      CsrfSecurityCustomizer csrfCustomizer,
      ApiAuthorizationCustomizer apiCustomizer,
      Oauth2SecurityCustomizer oauth2Customizer
  ) throws Exception {
    http
        .headers(headersCustomizer)
        .csrf(csrfCustomizer)
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(apiCustomizer)
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .oauth2ResourceServer(oauth2Customizer);

    return http.build();
  }

}
