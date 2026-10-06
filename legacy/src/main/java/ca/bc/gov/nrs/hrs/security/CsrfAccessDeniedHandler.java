package ca.bc.gov.nrs.hrs.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;

/**
 * Audits CSRF refusals that {@code CsrfFilter} handles without publishing an authorization event.
 *
 * <p>{@code CsrfFilter} calls its access-denied handler directly, so a missing or invalid CSRF
 * token would otherwise leave no security-event record. This handler logs the refusal with the
 * status the caller receives ({@code 403}) and the exception as {@code failureCategory}, then
 * delegates to {@link AccessDeniedHandlerImpl} so the response stays {@code sendError(403)}.
 * Any other access-denied exception is delegated without logging because
 * {@link SecurityEventLoggingListener} has already recorded the authorization denial.</p>
 */
@Component
public class CsrfAccessDeniedHandler implements AccessDeniedHandler {

  private final SecurityEventLoggingListener eventLogger;
  private final AccessDeniedHandlerImpl delegate = new AccessDeniedHandlerImpl();

  /**
   * Creates a handler that audits CSRF refusals through the shared security-event listener.
   *
   * @param eventLogger listener that writes the structured {@code SECURITY_EVENT} record
   */
  public CsrfAccessDeniedHandler(SecurityEventLoggingListener eventLogger) {
    this.eventLogger = eventLogger;
  }

  @Override
  public void handle(HttpServletRequest request, HttpServletResponse response,
      AccessDeniedException exception) throws IOException, ServletException {
    if (exception instanceof CsrfException csrfException) {
      eventLogger.logEvent(
          "AUTHORIZATION_DENIED",
          403,
          request,
          () -> SecurityContextHolder.getContext().getAuthentication(),
          csrfException.getClass().getSimpleName());
    }
    delegate.handle(request, response, exception);
  }
}
