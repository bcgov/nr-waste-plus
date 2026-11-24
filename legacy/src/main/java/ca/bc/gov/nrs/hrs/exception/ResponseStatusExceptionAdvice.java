package ca.bc.gov.nrs.hrs.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Renders {@link ResponseStatusException} as an RFC 9457 problem whose {@code instance} is the
 * request path.
 *
 * <p>Spring Boot's ProblemDetails handler is ordered at 0, so it takes
 * {@code ResponseStatusException} before {@link GlobalExceptionHandler} does. Spring Framework
 * 7.1 also stopped filling in the {@code instance} by default. This advice runs first and sets it
 * explicitly.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class ResponseStatusExceptionAdvice {

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
}
