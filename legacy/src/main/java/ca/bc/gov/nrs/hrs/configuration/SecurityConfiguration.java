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

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {

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
