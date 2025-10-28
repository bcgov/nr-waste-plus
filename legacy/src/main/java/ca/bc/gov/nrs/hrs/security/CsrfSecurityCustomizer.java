package ca.bc.gov.nrs.hrs.security;

import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.stereotype.Component;

/**
 * CSRF security customizer that configures token repository and CSRF handling
 * for the application.
 *
 * <p>The customizer uses a {@link CookieCsrfTokenRepository} to store the CSRF
 * token in a secure cookie so the client can retrieve it for request headers.
 * </p>
 */
@Component
public class CsrfSecurityCustomizer implements Customizer<CsrfConfigurer<HttpSecurity>> {

  @Override
  public void customize(CsrfConfigurer<HttpSecurity> csrfSpec) {
    csrfSpec
        .csrfTokenRepository(new CookieCsrfTokenRepository());
  }
}
