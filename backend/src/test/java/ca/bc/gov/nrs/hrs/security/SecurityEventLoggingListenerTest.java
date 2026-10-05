package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
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
    listener = new SecurityEventLoggingListener("backend-test", "test");
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
        .contains("event=AUTHENTICATION_FAILED", "service=backend-test", "status=401")
        .contains("method=POST", "routeTemplate=/api/users/preferences")
        .contains("correlationId=correlation-401", "failureCategory=BadCredentialsException");
    assertThat(message).doesNotContain(SECRET_MARKER, "Authorization", "Cookie", "password");
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
        .contains("subject=" + SUBJECT);
    assertThat(message)
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
    AuthorizationDeniedEvent<RequestAuthorizationContext> event =
        new AuthorizationDeniedEvent<RequestAuthorizationContext>(
            () -> null,
            new RequestAuthorizationContext(request),
            new AuthorizationDecision(false));

    listener.onAuthorizationDenied(event);

    String message = message();
    assertThat(message)
        .contains("event=AUTHENTICATION_FAILED", "status=401", "method=GET")
        .contains("routeTemplate=/api/reporting-units/{id}");
    assertThat(message).doesNotContain("event=AUTHORIZATION_DENIED", "status=403");
  }

  @Test
  void anonymousTokenAuthorizationDenialEmits401AuthenticationFailed() {
    MockHttpServletRequest request = request("GET", "/api/search/reporting-units");
    AuthorizationDeniedEvent<RequestAuthorizationContext> event =
        new AuthorizationDeniedEvent<>(
            () -> new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")),
            new RequestAuthorizationContext(request),
            new AuthorizationDecision(false));

    listener.onAuthorizationDenied(event);

    String message = message();
    assertThat(message)
        .contains("event=AUTHENTICATION_FAILED", "status=401")
        .contains("routeTemplate=/api/search/reporting-units");
    assertThat(message).doesNotContain("event=AUTHORIZATION_DENIED", "status=403");
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
