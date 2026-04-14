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
 * <p>
 * The customizer uses a {@link CookieCsrfTokenRepository} to store the CSRF
 * token in a secure cookie so the client can retrieve it for request headers.
 * </p>
 */
@Component
public class CsrfSecurityCustomizer implements Customizer<CsrfConfigurer<HttpSecurity>> {

  // Suppress SonarQube warning about HttpOnly=false for CSRF cookie.
  // This is intentional: the front-end needs to read the CSRF token from the cookie.
  @SuppressWarnings("java:S3330")
  @Override
  public void customize(CsrfConfigurer<HttpSecurity> csrfSpec) {
    CookieCsrfTokenRepository repo =
        CookieCsrfTokenRepository.withHttpOnlyFalse();

    repo.setCookieCustomizer(cookie -> {
      cookie.sameSite("Lax");
      cookie.secure(true);
      cookie.path("/");
    });

    csrfSpec.csrfTokenRepository(repo);
  }
}