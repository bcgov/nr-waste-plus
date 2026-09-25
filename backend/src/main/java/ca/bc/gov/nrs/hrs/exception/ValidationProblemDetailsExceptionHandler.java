package ca.bc.gov.nrs.hrs.exception;

import java.net.URI;
import java.util.stream.Collectors;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Problem-details exception advice that maps {@link MethodArgumentNotValidException} to HTTP 422
 * (Unprocessable Content) instead of the default HTTP 400, implementing the create/update contract
 * that all request-validation failures surface as 422.
 *
 * <p>Spring Boot auto-configures its own {@code ProblemDetailsExceptionHandler} (a bare subclass of
 * {@link ResponseEntityExceptionHandler} with {@code @Order(0)}) whenever {@code
 * spring.mvc.problemdetails.enabled=true}. Its order makes it win over every application {@code
 * @ControllerAdvice}, which would leave {@link GlobalExceptionHandler} shadowed. This class takes
 * over the same resolver slot: it is registered as a bean of type {@link
 * ResponseEntityExceptionHandler}, which suppresses the auto-configured handler via its {@code
 * @ConditionalOnMissingBean}, and it carries {@code @Order(0)} so it precedes {@link
 * GlobalExceptionHandler} exactly as the Boot handler did.
 *
 * <p>Every exception path except {@link MethodArgumentNotValidException} is inherited unchanged
 * from {@link ResponseEntityExceptionHandler}, so status codes and bodies stay identical to the
 * previous behavior.
 */
@ControllerAdvice
@Order(0)
public class ValidationProblemDetailsExceptionHandler extends ResponseEntityExceptionHandler {

  /**
   * Builds a 422 {@link ProblemDetail} containing all field validation messages instead of the
   * default 400 response.
   *
   * @param ex the validation exception containing the binding result with field errors
   * @param headers the response headers to merge into the response
   * @param status the status the superclass would have used (400); superseded by 422
   * @param request the current web request, used for the ProblemDetail instance URI
   * @return a {@link ResponseEntity} with status 422 and an {@code application/problem+json} body
   */
  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    String detail =
        ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining("; "));

    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_CONTENT);
    problem.setTitle("Validation Failed");
    problem.setDetail(detail.isEmpty() ? "One or more validation errors occurred." : detail);
    URI instance = instanceUri(request);
    if (instance != null) {
      problem.setInstance(instance);
    }

    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem);
  }

  private static URI instanceUri(WebRequest request) {
    if (request instanceof ServletWebRequest servletWebRequest) {
      return URI.create(servletWebRequest.getRequest().getRequestURI());
    }
    return null;
  }
}
