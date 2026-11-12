package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.event.AuthorizationDeniedEvent;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.core.DefaultOAuth2AuthenticatedPrincipal;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class SecurityEventLoggingListenerTest {
  private static final String ISSUER = "https://issuer.test.example/pool";
  private static final String SUBJECT = "synthetic-subject";
  private static final String SECRET_MARKER = "never-log-this-value";

  private final Logger logger = (Logger) LoggerFactory.getLogger(SecurityEventLoggingListener.class);
  private ListAppender<ILoggingEvent> appender;
  private SecurityEventLoggingListener listener;

  @BeforeEach
  void setUp() {
    appender = new ListAppender<>();
    appender.start();
    logger.addAppender(appender);
    listener = new SecurityEventLoggingListener("legacy-test", "test");
  }

  @AfterEach
  void tearDown() {
    RequestContextHolder.resetRequestAttributes();
    MDC.clear();
    logger.detachAppender(appender);
  }

  @Test
  void authenticationFailureEmits401WithSafeStructuredFields() {
    MockHttpServletRequest request = request("POST", "/api/users/preferences");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    MDC.put("traceId", "correlation-401");

    listener.onAuthenticationFailure(
        new AuthenticationFailureBadCredentialsEvent(
            new UsernamePasswordAuthenticationToken("ignored", SECRET_MARKER),
            new BadCredentialsException("password=" + SECRET_MARKER)));

    String message = message();
    assertThat(message)
        .contains("event=AUTHENTICATION_FAILED", "service=legacy-test", "status=401")
        .contains("method=POST", "routeTemplate=/api/users/preferences")
        .contains("correlationId=correlation-401", "failureCategory=BadCredentialsException")
        .doesNotContain(SECRET_MARKER, "Authorization", "Cookie", "password");
  }

  @Test
  void authorizationDenialEmits403WithIssuerSubjectAndNoSensitiveMaterial() {
    MockHttpServletRequest request = request("GET", "/api/reporting-units/123");
    Jwt jwt = Jwt.withTokenValue(SECRET_MARKER)
        .header("alg", "RS256")
        .issuer(ISSUER)
        .subject(SUBJECT)
        .issuedAt(Instant.now())
        .expiresAt(Instant.now().plusSeconds(60))
        .claim("client_id", SECRET_MARKER)
        .claim("scope", List.of("secret-scope"))
        .build();
    JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwt);
    AuthorizationDeniedEvent<RequestAuthorizationContext> event =
        new AuthorizationDeniedEvent<>(
            () -> authentication,
            new RequestAuthorizationContext(request),
            new AuthorizationDecision(false));
    MDC.put("X-B3-TraceId", "correlation-403");

    listener.onAuthorizationDenied(event);

    String message = message();
    assertThat(message)
        .contains("event=AUTHORIZATION_DENIED", "status=403", "method=GET")
        .contains("routeTemplate=/api/reporting-units/{id}")
        .contains("correlationId=correlation-403", "identityProvider=" + ISSUER)
        .contains("subject=" + SUBJECT)
        .doesNotContain(
            SECRET_MARKER,
            "secret-scope",
            "Authorization",
            "Cookie",
            "session",
            "claims",
            "body",
            "query");
  }

  @Test
  void unauthenticatedAuthorizationDenialEmits401AuthenticationFailed() {
    MockHttpServletRequest request = request("GET", "/api/reporting-units/123");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    AuthorizationDeniedEvent<RequestAuthorizationContext> event =
        new AuthorizationDeniedEvent<RequestAuthorizationContext>(
            () -> null,
            new RequestAuthorizationContext(request),
            new AuthorizationDecision(false));

    listener.onAuthorizationDenied(event);

    String message = message();
    assertThat(message)
        .contains("event=AUTHENTICATION_FAILED", "status=401", "method=GET")
        .contains("routeTemplate=/api/reporting-units/{id}")
        .doesNotContain("event=AUTHORIZATION_DENIED", "status=403");
  }

  @Test
  void anonymousTokenAuthorizationDenialEmits401AuthenticationFailed() {
    MockHttpServletRequest request = request("GET", "/api/reporting-units/123");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    AuthorizationDeniedEvent<RequestAuthorizationContext> event =
        new AuthorizationDeniedEvent<>(
            () ->
                new AnonymousAuthenticationToken(
                    "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")),
            new RequestAuthorizationContext(request),
            new AuthorizationDecision(false));

    listener.onAuthorizationDenied(event);

    String message = message();
    assertThat(message)
        .contains("event=AUTHENTICATION_FAILED", "status=401")
        .doesNotContain("event=AUTHORIZATION_DENIED");
  }

  @Test
  void oauth2PrincipalAndRequestContextFallbackAreLoggedSafely() {
    MockHttpServletRequest request = request("PATCH", "/api/clients/42");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    DefaultOAuth2User principal = new DefaultOAuth2User(
        AuthorityUtils.createAuthorityList("ROLE_USER"),
        Map.of("iss", ISSUER, "sub", SUBJECT),
        "sub");
    UsernamePasswordAuthenticationToken authentication =
        UsernamePasswordAuthenticationToken.authenticated(principal, "", List.of());
    AuthorizationDeniedEvent<Object> event = new AuthorizationDeniedEvent<>(
        () -> authentication,
        new Object(),
        new AuthorizationDecision(false));
    MDC.put("X-TRACE-ID", "correlation-fallback");

    listener.onAuthorizationDenied(event);

    assertThat(message())
        .contains("event=AUTHORIZATION_DENIED", "status=403", "method=PATCH")
        .contains("routeTemplate=/api/clients/42", "correlationId=correlation-fallback")
        .contains("identityProvider=" + ISSUER, "subject=" + SUBJECT)
        .doesNotContain(SECRET_MARKER);
  }

  @Test
  void authenticationFailureWithoutRequestContextLogsEmptyRequestFields() {
    listener.onAuthenticationFailure(
        new AuthenticationFailureBadCredentialsEvent(
            new UsernamePasswordAuthenticationToken("ignored", SECRET_MARKER),
            new BadCredentialsException("invalid credentials")));

    assertThat(message())
        .contains("event=AUTHENTICATION_FAILED", "status=401", "method=", "routeTemplate=")
        .doesNotContain(SECRET_MARKER);
  }

  @Test
  void nonStringOauthIdentityAttributesAreLoggedAsEmptyValues() {
    MockHttpServletRequest request = request("GET", "/api/clients/42");
    DefaultOAuth2AuthenticatedPrincipal principal = new DefaultOAuth2AuthenticatedPrincipal(
        "principal",
        Map.of("iss", 42, "sub", 99),
        AuthorityUtils.createAuthorityList("ROLE_USER"));
    UsernamePasswordAuthenticationToken authentication =
        UsernamePasswordAuthenticationToken.authenticated(principal, "", List.of());
    AuthorizationDeniedEvent<RequestAuthorizationContext> event = new AuthorizationDeniedEvent<>(
        () -> authentication,
        new RequestAuthorizationContext(request),
        new AuthorizationDecision(false));

    listener.onAuthorizationDenied(event);

    assertThat(message())
        .contains("event=AUTHORIZATION_DENIED", "status=403", "identityProvider= subject=")
        .doesNotContain(SECRET_MARKER);
  }

  @Test
  void blankPrimaryTraceIdFallsBackToNextAvailableTraceId() {
    MDC.put("traceId", "  ");
    MDC.put("X-B3-TraceId", "fallback-correlation");

    listener.onAuthenticationFailure(
        new AuthenticationFailureBadCredentialsEvent(
            new UsernamePasswordAuthenticationToken("ignored", SECRET_MARKER),
            new BadCredentialsException("invalid credentials")));

    assertThat(message()).contains("correlationId=fallback-correlation");
  }

  private static MockHttpServletRequest request(String method, String route) {
    MockHttpServletRequest request = new MockHttpServletRequest(method, route);
    request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, route.replace("123", "{id}"));
    request.addHeader("Authorization", "Bearer " + SECRET_MARKER);
    request.addHeader("X-Api-Key", SECRET_MARKER);
    request.setCookies(new Cookie("session", SECRET_MARKER));
    request.setQueryString("token=" + SECRET_MARKER);
    return request;
  }

  private String message() {
    assertThat(appender.list).hasSize(1);
    return appender.list.getFirst().getFormattedMessage();
  }
}
