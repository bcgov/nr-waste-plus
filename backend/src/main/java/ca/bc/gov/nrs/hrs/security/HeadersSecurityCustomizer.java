package ca.bc.gov.nrs.hrs.security;

import ca.bc.gov.nrs.hrs.util.SecurityEnvironmentUtil;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.FrameOptionsConfig;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.XXssConfig;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.stereotype.Component;

/**
 * Configuration for HTTP security headers applied to the application.
 *
 * <p>
 * This customizer builds a Content-Security-Policy and other security headers.
 * The CSP differs between local and non-local environments to enable development
 * conveniences when needed.
 * </p>
 */
@RequiredArgsConstructor
@Component
public class HeadersSecurityCustomizer
    implements Customizer<HeadersConfigurer<HttpSecurity>> {

  @Value("${ca.bc.gov.nrs.self-uri}")
  String selfUri;

  /**
   * The environment of the application, injected from application properties.
   * Default value is "PROD".
   */
  @Value("${ca.bc.gov.nrs.environment:PROD}")
  String environment;

  private static final List<String> PERMISSIONS = List.of(
      "geolocation",
      "microphone",
      "camera",
      "speaker",
      "usb",
      "bluetooth",
      "payment",
      "interest-cohort"
  );

  @Override
  public void customize(HeadersConfigurer<HttpSecurity> headerSpec) {

    String policyDirectives;

    if (SecurityEnvironmentUtil.isLocalEnvironment(environment)) {
      policyDirectives = String.join("; ",
          "default-src 'self'",
          "connect-src 'self' " + selfUri,
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "object-src 'none'",
          "base-uri 'none'",
          "frame-ancestors 'none'",
          "report-uri " + selfUri
      );
    } else {
      policyDirectives = String.join("; ",
          "default-src 'none'",
          "connect-src 'self' " + selfUri,
          "script-src 'strict-dynamic' 'nonce-" + UUID.randomUUID() + "' https:",
          "object-src 'none'",
          "base-uri 'none'",
          "frame-ancestors 'none'",
          "require-trusted-types-for 'script'",
          "report-uri " + selfUri
      );
    }

    headerSpec
        .frameOptions(FrameOptionsConfig::deny)
        .contentSecurityPolicy(csp ->
            csp.policyDirectives(policyDirectives))
        .httpStrictTransportSecurity(hsts ->
            hsts.maxAgeInSeconds(Duration.ofDays(30).getSeconds())
                .includeSubDomains(true))
        .xssProtection(XXssConfig::disable)
        .contentTypeOptions(Customizer.withDefaults())
        .referrerPolicy(referrer ->
            referrer.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
        .addHeaderWriter(new StaticHeadersWriter(
            "Permissions-Policy",
            PERMISSIONS.stream()
                .map(p -> String.format("%s=()", p))
                .collect(Collectors.joining(", "))
        ))
        .addHeaderWriter(new StaticHeadersWriter(
            "Cross-Origin-Opener-Policy",
            "same-origin"
        ))
        .addHeaderWriter(new StaticHeadersWriter(
            "Cross-Origin-Embedder-Policy",
            "require-corp"
        ))
        .addHeaderWriter(new StaticHeadersWriter(
            "Cross-Origin-Resource-Policy",
            "same-origin"
        ))
        .addHeaderWriter(new StaticHeadersWriter(
            "Cache-Control", 
            "no-store, no-cache, must-revalidate, max-age=0"
        ))
        .addHeaderWriter(new StaticHeadersWriter(
            "Pragma", 
            "no-cache"
        ));
  }
  
}