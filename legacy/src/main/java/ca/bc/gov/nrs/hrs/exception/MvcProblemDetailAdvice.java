package ca.bc.gov.nrs.hrs.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Renders Spring MVC errors as RFC 9457 problems whose {@code instance} is the request path.
 *
 * <p>Spring Boot's ProblemDetails handler is ordered at 0, so it takes the MVC exceptions it
 * handles before {@link GlobalExceptionHandler} does. Spring Framework 7.1 also stopped filling in
 * the {@code instance} by default. This advice runs first: it stamps {@code instance} on every
 * problem it renders and keeps the explicit rendering of {@link ResponseStatusException}.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class MvcProblemDetailAdvice extends ResponseEntityExceptionHandler {

  /**
   * Handles {@link ResponseStatusException} instances raised by application code.
   *
   * @param ex the exception to translate
   * @param request the current HTTP request
   * @return a {@link ProblemDetail} response using the exception status
   */
  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ProblemDetail> handleResponseStatusException(
      ResponseStatusException ex, HttpServletRequest request) {

    var status = ex.getStatusCode();

    if (status.is5xxServerError()) {
      log.error("ResponseStatusException: {}", ex.getMessage(), ex);
    } else {
      log.warn("ResponseStatusException: {}", ex.getMessage());
    }

    String title = HttpStatus.resolve(status.value()) != null
        ? HttpStatus.resolve(status.value()).getReasonPhrase()
        : status.toString();

    ProblemDetail problem = ProblemDetail.forStatus(status);
    problem.setTitle(title);
    problem.setDetail(ex.getReason() != null ? ex.getReason() : ex.getMessage());
    problem.setInstance(URI.create(request.getRequestURI()));

    return ResponseEntity.status(status)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem);
  }

  /**
   * Stamps the request path as {@code instance} on problems rendered by the base handler.
   *
   * <p>Spring Framework 7.1 no longer fills in {@code instance}, so 405, 404, 415 and the other
   * MVC errors that {@link ResponseEntityExceptionHandler} handles would render without it. A
   * {@code null} response from the base handler (already committed) is returned unchanged.
   */
  @Override
  protected ResponseEntity<Object> handleExceptionInternal(
      Exception ex,
      @Nullable Object body,
      HttpHeaders headers,
      HttpStatusCode statusCode,
      WebRequest request) {

    ResponseEntity<Object> response =
        super.handleExceptionInternal(ex, body, headers, statusCode, request);

    if (response != null
        && response.getBody() instanceof ProblemDetail problem
        && problem.getInstance() == null
        && request instanceof ServletWebRequest servletRequest) {
      problem.setInstance(URI.create(servletRequest.getRequest().getRequestURI()));
    }

    return response;
  }
}
