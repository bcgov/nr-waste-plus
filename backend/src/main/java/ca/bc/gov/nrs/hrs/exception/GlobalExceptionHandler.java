package ca.bc.gov.nrs.hrs.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Global exception handler that converts exceptions into RFC 7807 ProblemDetail
 * responses (application/problem+json).
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

  /**
   * Handle database constraint violations and convert them to an RFC 7807
   * ProblemDetail response.
   *
   * <p>This method maps {@link DataIntegrityViolationException} to an HTTP
   * 409 CONFLICT response. The response body is an {@link ProblemDetail}
   * (content type application/problem+json) with a title of
   * "Database Constraint Violation" and a detail message extracted from the
   * most specific cause of the exception when available.</p>
   *
   * @param ex the caught {@link DataIntegrityViolationException}
   * @param request the current {@link HttpServletRequest} (used to set the
   *        ProblemDetail instance URI)
   * @return a {@link ResponseEntity} containing a {@link ProblemDetail} with
   *         status {@link org.springframework.http.HttpStatus#CONFLICT}
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ProblemDetail> handleDataIntegrityViolation(
      DataIntegrityViolationException ex, HttpServletRequest request) {
    log.warn("Data integrity violation: {}", ex.getMessage(), ex);

    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
    problem.setTitle("Database Constraint Violation");
    problem.setDetail(extractConstraintMessage(ex));
    problem.setInstance(URI.create(request.getRequestURI()));

    return ResponseEntity.status(HttpStatus.CONFLICT)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ProblemDetail> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex, HttpServletRequest request) {
    log.warn("Validation failed: {}", ex.getMessage());

    var errors = ex.getBindingResult().getFieldErrors().stream()
        .map(FieldError::getDefaultMessage)
        .collect(Collectors.joining("; "));

    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
    problem.setTitle("Validation Failed");
    problem.setDetail(errors.isEmpty() ? "One or more validation errors occurred." : errors);
    problem.setInstance(URI.create(request.getRequestURI()));

    return ResponseEntity.badRequest()
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem);
  }

  /**
   * Handle {@link MethodArgumentNotValidException} thrown when {@code @Valid}
   * annotated controller method arguments fail validation.
   *
   * <p>Extracts field validation error messages and returns an HTTP 400 Bad
   * Request with an {@link ProblemDetail} body (application/problem+json).
   * The ProblemDetail.title is set to "Validation Failed" and the detail
   * contains a semicolon-delimited list of field error messages (or a
   * generic message when none are present).</p>
   *
   * @param ex the validation exception containing binding errors
   * @param request the current {@link HttpServletRequest} used to populate the
   *        ProblemDetail instance URI
   * @return a 400 {@link ResponseEntity} containing a {@link ProblemDetail}
   */

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ProblemDetail> handleConstraintViolation(
      ConstraintViolationException ex, HttpServletRequest request) {
    log.warn("Constraint violations: {}", ex.getMessage());

    String detail = ex.getConstraintViolations().stream()
        .map(cv -> cv.getPropertyPath() + ": " + cv.getMessage())
        .collect(Collectors.joining("; "));

    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
    problem.setTitle("Validation Error");
    problem.setDetail(detail.isEmpty() ? "Constraint violation" : detail);
    problem.setInstance(URI.create(request.getRequestURI()));

    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem);
  }

  /**
   * Handle {@link ConstraintViolationException} typically raised by
   * validation on constructor or method parameters (for example when using
   * {@code @Validated} on beans).
   *
   * <p>Builds a semicolon-delimited string of constraint violations where
   * each entry contains the property path and the violation message. Returns
   * HTTP 400 Bad Request with an {@link ProblemDetail} (application/problem+json)
   * containing the combined detail.</p>
   *
   * @param ex the constraint violation exception
   * @param request the current {@link HttpServletRequest} used to set the
   *        ProblemDetail instance URI
   * @return a 400 {@link ResponseEntity} containing a {@link ProblemDetail}
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
   * Handle {@link ResponseStatusException} which carries an HTTP status and
   * optional reason.
   *
   * <p>This handler resolves the appropriate title from the HTTP status
   * reason phrase (falling back to the status token) and sets the ProblemDetail
   * status to the exception's status. The ProblemDetail.detail is populated
   * from {@link ResponseStatusException#getReason()} when available or the
   * exception message otherwise.</p>
   *
   * @param ex the ResponseStatusException thrown by controllers or services
   * @param request the current {@link HttpServletRequest} used to populate the
   *        ProblemDetail instance URI
   * @return a {@link ResponseEntity} whose status matches the exception status
   */

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ProblemDetail> handleGenericException(
      Exception ex, HttpServletRequest request) {
    log.error("Unhandled exception caught: {}", ex.getMessage(), ex);

    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    problem.setTitle("Internal Server Error");
    problem.setDetail("An unexpected error occurred. Please contact support if this persists.");
    problem.setInstance(URI.create(request.getRequestURI()));

    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem);
  }

  /**
   * Attempts to extract the most useful message from a
   * {@link DataIntegrityViolationException}.
   *
   * @param ex the data integrity violation exception
   * @return the most specific available constraint violation message, or a
   *         fallback message when none is available
   */
  private String extractConstraintMessage(DataIntegrityViolationException ex) {
    Throwable mostSpecific = ex.getMostSpecificCause();
    if (mostSpecific != null && mostSpecific.getMessage() != null) {
      return mostSpecific.getMessage();
    }
    if (ex.getMessage() != null) {
      return ex.getMessage();
    }
    return "A database constraint was violated.";
  }
}