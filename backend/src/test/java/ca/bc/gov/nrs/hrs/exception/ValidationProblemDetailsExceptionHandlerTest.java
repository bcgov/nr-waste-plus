package ca.bc.gov.nrs.hrs.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

class ValidationProblemDetailsExceptionHandlerTest {

  private static final String REQUEST_URI = "/api/configuration/formulas";
  private static final String FALLBACK_DETAIL = "One or more validation errors occurred.";

  private ValidationProblemDetailsExceptionHandler handler;

  @BeforeEach
  void setUp() {
    handler = new ValidationProblemDetailsExceptionHandler();
  }

  @Test
  @DisplayName("Returns 422 with field and object-level messages while preserving response headers")
  void shouldReturn422WithAllMessagesAndPreserveHeaders() throws Exception {
    BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
    bindingResult.addError(new FieldError("request", "formulas[0].expression", "SYNTAX_ERROR"));
    bindingResult.addError(new ObjectError("request", "Formula keys must be unique."));

    HttpHeaders headers = new HttpHeaders();
    headers.set("X-Correlation-Id", "corr-123");

    ResponseEntity<Object> response =
        handler.handleMethodArgumentNotValid(
            validationException(bindingResult), headers, HttpStatus.BAD_REQUEST, webRequest());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
    assertThat(response.getHeaders().getFirst("X-Correlation-Id")).isEqualTo("corr-123");
    assertThat(response.getHeaders().getContentType())
        .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);

    ProblemDetail problem = (ProblemDetail) response.getBody();
    assertThat(problem).isNotNull();
    assertThat(problem.getTitle()).isEqualTo("Validation Failed");
    assertThat(problem.getDetail())
        .contains("SYNTAX_ERROR", "Formula keys must be unique.", "; ")
        .doesNotContain(FALLBACK_DETAIL);
    assertThat(problem.getInstance()).hasToString(REQUEST_URI);
  }

  @Test
  @DisplayName("Falls back to the generic detail when the binding result carries no messages")
  void shouldFallbackToGenericDetailWhenBindingResultHasNoMessages() throws Exception {
    BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");

    ResponseEntity<Object> response =
        handler.handleMethodArgumentNotValid(
            validationException(bindingResult),
            HttpHeaders.EMPTY,
            HttpStatus.BAD_REQUEST,
            webRequest());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
    assertThat(response.getHeaders().getContentType())
        .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);

    ProblemDetail problem = (ProblemDetail) response.getBody();
    assertThat(problem).isNotNull();
    assertThat(problem.getDetail()).isEqualTo(FALLBACK_DETAIL);
  }

  @Test
  @DisplayName("Stamps the request URI as instance on a 405 rendered by the base handler")
  void shouldStampInstanceOnMethodNotAllowed() throws Exception {
    HttpRequestMethodNotSupportedException ex =
        new HttpRequestMethodNotSupportedException("POST", Collections.singletonList("GET"));

    ResponseEntity<Object> response = handler.handleException(ex, webRequest());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    ProblemDetail problem = (ProblemDetail) response.getBody();
    assertThat(problem).isNotNull();
    assertThat(problem.getInstance()).hasToString(REQUEST_URI);
  }

  @Test
  @DisplayName("Stamps the request URI as instance on a 404 rendered by the base handler")
  void shouldStampInstanceOnNoResourceFound() throws Exception {
    NoResourceFoundException ex =
        new NoResourceFoundException(HttpMethod.GET, REQUEST_URI, "missing.css");

    ResponseEntity<Object> response = handler.handleException(ex, webRequest());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    ProblemDetail problem = (ProblemDetail) response.getBody();
    assertThat(problem).isNotNull();
    assertThat(problem.getInstance()).hasToString(REQUEST_URI);
  }

  @Test
  @DisplayName("Stamps the request URI as instance on a ResponseStatusException")
  void shouldStampInstanceOnResponseStatusException() throws Exception {
    ResponseStatusException ex =
        new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "Stale etag.");

    ResponseEntity<Object> response = handler.handleException(ex, webRequest());

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PRECONDITION_REQUIRED);
    ProblemDetail problem = (ProblemDetail) response.getBody();
    assertThat(problem).isNotNull();
    assertThat(problem.getInstance()).hasToString(REQUEST_URI);
  }

  @Test
  @DisplayName("Returns null instead of failing when the response is already committed")
  void shouldReturnNullWhenResponseAlreadyCommitted() throws Exception {
    MockHttpServletResponse committed = new MockHttpServletResponse();
    committed.flushBuffer();
    ServletWebRequest request =
        new ServletWebRequest(new MockHttpServletRequest("POST", REQUEST_URI), committed);

    ResponseEntity<Object> response =
        handler.handleException(
            new HttpRequestMethodNotSupportedException("POST", Collections.singletonList("GET")),
            request);

    assertThat(response).isNull();
  }

  private static MethodArgumentNotValidException validationException(BindingResult bindingResult)
      throws NoSuchMethodException {
    Method method =
        ValidationProblemDetailsExceptionHandlerTest.class.getDeclaredMethod(
            "validationTarget", String.class);
    return new MethodArgumentNotValidException(new MethodParameter(method, 0), bindingResult);
  }

  private static ServletWebRequest webRequest() {
    return new ServletWebRequest(new MockHttpServletRequest("POST", REQUEST_URI));
  }

  /** Fixture only; supplies a parameter for the {@link MethodArgumentNotValidException}. */
  @SuppressWarnings("unused")
  private static void validationTarget(String value) {
    // no-op fixture method used solely to build a MethodParameter
  }
}
