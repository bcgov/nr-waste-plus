package ca.bc.gov.nrs.hrs.security;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;

@DisplayName("Unit Test | CSRF Access Denied Handler")
class CsrfAccessDeniedHandlerTest {

  private final Logger logger = (Logger) LoggerFactory.getLogger(SecurityEventLoggingListener.class);
  private ListAppender<ILoggingEvent> appender;
  private CsrfAccessDeniedHandler handler;

  @BeforeEach
  void setUp() {
    appender = new ListAppender<>();
    appender.start();
    logger.addAppender(appender);
    handler = new CsrfAccessDeniedHandler(new SecurityEventLoggingListener("legacy-test", "test"));
  }

  @AfterEach
  void tearDown() {
    logger.detachAppender(appender);
    appender.stop();
  }

  @Test
  @DisplayName("should audit a missing CSRF token with 403 and still answer 403")
  void missingCsrfTokenIsAuditedWith403AndAnsweredForbidden() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/reporting-units");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.handle(request, response, new MissingCsrfTokenException("csrf"));

    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(securityEventMessage())
        .contains(
            "event=AUTHORIZATION_DENIED",
            "status=403",
            "method=POST",
            "failureCategory=MissingCsrfTokenException");
  }

  @Test
  @DisplayName("should not double-log an authorization denial the listener already recorded")
  void nonCsrfDenialIsNotLoggedAgain() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/reporting-units");
    MockHttpServletResponse response = new MockHttpServletResponse();

    handler.handle(request, response, new AccessDeniedException("denied"));

    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(appender.list).isEmpty();
  }

  private String securityEventMessage() {
    assertThat(appender.list).hasSize(1);
    return appender.list.getFirst().getFormattedMessage();
  }
}
