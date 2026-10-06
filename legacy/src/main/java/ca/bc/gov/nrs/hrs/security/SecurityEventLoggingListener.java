package ca.bc.gov.nrs.hrs.security;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.event.AbstractAuthenticationFailureEvent;
import org.springframework.security.authorization.event.AuthorizationDeniedEvent;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.HandlerMapping;

/** Emits the security-event audit record without copying request credentials into logs. */
@Component
public class SecurityEventLoggingListener {
  private static final Logger LOG = LoggerFactory.getLogger(SecurityEventLoggingListener.class);

  private final String service;
  private final String environment;

  public SecurityEventLoggingListener(
      @Value("${spring.application.name:nr-waste-legacy}") String service,
      @Value("${ca.bc.gov.nrs.environment:local}") String environment) {
    this.service = service;
    this.environment = environment;
  }

  @EventListener
  public void onAuthenticationFailure(AbstractAuthenticationFailureEvent event) {
    logEvent("AUTHENTICATION_FAILED", 401, currentRequest(), null,
        event.getException().getClass().getSimpleName());
  }

  /**
   * Records a denied authorization for the current request.
   *
   * <p>The reported status follows the response the caller will receive: an anonymous caller is
   * re-challenged by {@code ExceptionTranslationFilter} and answered {@code 401}, so the denial is
   * reported as {@code AUTHENTICATION_FAILED}; an authenticated caller refused by a rule is
   * answered {@code 403} and is reported as {@code AUTHORIZATION_DENIED}. This keeps the audit
   * status aligned with the HTTP status for both cases.</p>
   *
   * @param event the authorization-denied event carrying the request and authentication supplier
   */
  @EventListener
  public void onAuthorizationDenied(AuthorizationDeniedEvent<?> event) {
    HttpServletRequest request = event.getObject() instanceof RequestAuthorizationContext context
        ? context.getRequest() : currentRequest();
    Supplier<Authentication> supplier = event.getAuthentication();
    Authentication authentication = supplier != null ? supplier.get() : null;
    if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
      logEvent("AUTHENTICATION_FAILED", 401, request, event.getAuthentication(), null);
      return;
    }
    logEvent("AUTHORIZATION_DENIED", 403, request, event.getAuthentication(), null);
  }

  void logEvent(String eventName, int status, HttpServletRequest request,
      Supplier<Authentication> authentication, String failureCategory) {
    String identity = safeIdentity(authentication);
    String[] parts = identity == null ? new String[] {"", ""} : identity.split("\\|", 2);
    String issuer = parts[0];
    String subject = parts.length > 1 ? parts[1] : "";
    Object pattern = request == null ? null
        : request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
    String method = request == null ? "" : request.getMethod();
    String routeTemplate = pattern instanceof String stringPattern ? stringPattern : "";
    String correlationId = correlationId();
    String category = failureCategory == null ? "" : failureCategory;
    LOG.info("SECURITY_EVENT event={} service={} environment={} timestamp={} method={} "
            + "routeTemplate={} status={} correlationId={} identityProvider={} subject={} "
            + "failureCategory={}",
        eventName, service, environment, Instant.now(),
        method, routeTemplate, status, correlationId, issuer, subject, category);
  }

  private static String correlationId() {
    for (String key : new String[] {"traceId", "X-B3-TraceId", "X-TRACE-ID"}) {
      String value = MDC.get(key);
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return "";
  }

  private static String safeIdentity(Supplier<Authentication> supplier) {
    if (supplier == null) {
      return null;
    }
    Authentication authentication = supplier.get();
    Object principal = authentication == null ? null : authentication.getPrincipal();
    if (principal instanceof Jwt jwt) {
      return (jwt.getIssuer() == null ? "" : jwt.getIssuer().toString()) + "|"
          + valueOrEmpty(jwt.getSubject());
    }
    if (principal instanceof OAuth2AuthenticatedPrincipal principalValue) {
      return valueOrEmpty(principalValue.getAttribute("iss")) + "|"
          + valueOrEmpty(principalValue.getAttribute("sub"));
    }
    return null;
  }

  private static String valueOrEmpty(Object value) {
    return value instanceof String stringValue ? stringValue : "";
  }

  private static HttpServletRequest currentRequest() {
    if (RequestContextHolder.getRequestAttributes()
        instanceof ServletRequestAttributes attributes) {
      return attributes.getRequest();
    }
    return null;
  }
}
