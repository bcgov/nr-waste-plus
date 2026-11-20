package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.ContentSecurityPolicyConfig;
import org.springframework.test.util.ReflectionTestUtils;

class HeadersSecurityCustomizerTest {

  @SuppressWarnings({"rawtypes", "unchecked"})
  @Test
  void configuresStrictContentSecurityPolicyOutsideLocalEnvironment() {
    HeadersConfigurer<HttpSecurity> headers = mock(HeadersConfigurer.class);
    ContentSecurityPolicyConfig contentSecurityPolicy = mock(ContentSecurityPolicyConfig.class);
    when(headers.frameOptions(any())).thenReturn(headers);
    when(headers.httpStrictTransportSecurity(any())).thenReturn(headers);
    when(headers.xssProtection(any())).thenReturn(headers);
    when(headers.contentTypeOptions(any())).thenReturn(headers);
    when(headers.referrerPolicy(any())).thenReturn(headers);
    when(headers.permissionsPolicyHeader(any())).thenReturn(headers);
    when(headers.contentSecurityPolicy(any())).thenAnswer(invocation -> {
      Customizer callback = invocation.getArgument(0);
      callback.customize(contentSecurityPolicy);
      return headers;
    });

    HeadersSecurityCustomizer customizer = new HeadersSecurityCustomizer();
    ReflectionTestUtils.setField(customizer, "selfUri", "https://waste.example.gov");
    ReflectionTestUtils.setField(customizer, "environment", "production");

    customizer.customize(headers);

    var policyCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
    verify(contentSecurityPolicy).policyDirectives(policyCaptor.capture());
    assertThat(policyCaptor.getValue())
        .contains("default-src 'none'")
        .contains("connect-src 'self' https://waste.example.gov")
        .contains("script-src 'strict-dynamic' 'nonce-")
        .contains("require-trusted-types-for 'script'")
        .contains("report-uri https://waste.example.gov")
        .doesNotContain("unsafe-inline");
  }
}
