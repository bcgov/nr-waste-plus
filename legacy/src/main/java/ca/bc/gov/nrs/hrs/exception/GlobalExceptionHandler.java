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
   * Handles database integrity violations and returns a conflict problem response.
   *
   * @param ex the exception that was raised
   * @param request the current HTTP request
   * @return a {@link ProblemDetail} response with HTTP 409 status
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

  /**
   * Handles bean-validation failures raised during request body binding.
   *
   * @param ex the validation exception
   * @param request the current HTTP request
   * @return a {@link ProblemDetail} response with HTTP 400 status
   */
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
   * Handles constraint violations raised outside of request-body binding.
   *
   * @param ex the validation exception
   * @param request the current HTTP request
   * @return a {@link ProblemDetail} response with HTTP 400 status
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
   * Handles any uncaught exception and returns a generic internal-server-error response.
   *
   * @param ex the uncaught exception
   * @param request the current HTTP request
   * @return a {@link ProblemDetail} response with HTTP 500 status
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
   * Attempts to extract the most useful message from a DataIntegrityViolationException.
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