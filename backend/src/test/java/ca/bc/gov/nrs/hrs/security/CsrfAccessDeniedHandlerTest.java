package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.web.servlet.HandlerMapping;

class CsrfAccessDeniedHandlerTest {

  private final Logger logger = (Logger) LoggerFactory.getLogger(SecurityEventLoggingListener.class);
  private ListAppender<ILoggingEvent> appender;
  private CsrfAccessDeniedHandler handler;

  @BeforeEach
  void setUp() {
    appender = new ListAppender<>();
    appender.start();
    logger.addAppender(appender);
    handler = new CsrfAccessDeniedHandler(new SecurityEventLoggingListener("backend-test", "test"));
  }

  @AfterEach
  void tearDown() {
    logger.detachAppender(appender);
  }

  @Test
  void missingCsrfTokenIsAuditedWith403AndAnsweredForbidden() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/reporting-units");
    request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/reporting-units");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.handle(
        request,
        response,
        new MissingCsrfTokenException("missing-csrf-token"));

    assertThat(response.getStatus()).isEqualTo(403);
    List<String> messages = appender.list.stream()
        .map(ILoggingEvent::getFormattedMessage)
        .filter(message -> message.contains("SECURITY_EVENT"))
        .toList();
    assertThat(messages).hasSize(1);
    assertThat(messages.getFirst())
        .contains("event=AUTHORIZATION_DENIED", "status=403", "method=POST")
        .contains("routeTemplate=/api/reporting-units", "failureCategory=MissingCsrfTokenException");
  }

  @Test
  void nonCsrfDenialIsNotLoggedAgain() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/reporting-units");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.handle(
        request,
        response,
        new AccessDeniedException("already-audited-by-listener"));

    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(appender.list).isEmpty();
  }
}
