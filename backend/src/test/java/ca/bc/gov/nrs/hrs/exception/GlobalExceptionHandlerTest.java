package ca.bc.gov.nrs.hrs.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.TransactionSystemException;

class GlobalExceptionHandlerTest {

  private static final String REQUEST_URI = "/api/example";

  private GlobalExceptionHandler handler;
  private HttpServletRequest request;

  @BeforeEach
  void setUp() {
    handler = new GlobalExceptionHandler();
    request = mock(HttpServletRequest.class);
    when(request.getRequestURI()).thenReturn(REQUEST_URI);
  }

  @Test
  void shouldReturnSafeProblemDetailWhenTransactionCannotBeCreated() {
    var cause = new IllegalStateException("password=secret database failure");
    var exception = new CannotCreateTransactionException("transaction failed", cause);

    ResponseEntity<ProblemDetail> response =
        handler.handleCannotCreateTransaction(exception, request);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Service Unavailable");
    assertThat(response.getBody().getDetail()).doesNotContain("password=secret");
    assertThat(response.getBody().getInstance()).hasToString(REQUEST_URI);
  }

  @Test
  void shouldReturnSafeProblemDetailWhenTransactionCompletionFails() {
    var cause = new IllegalStateException("jdbcUrl=jdbc:postgresql://internal failure");
    var exception = new TransactionSystemException("transaction failed", cause);

    ResponseEntity<ProblemDetail> response =
        handler.handleTransactionSystemException(exception, request);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getTitle()).isEqualTo("Transaction Failed");
    assertThat(response.getBody().getDetail()).doesNotContain("jdbcUrl=");
    assertThat(response.getBody().getInstance()).hasToString(REQUEST_URI);
  }

  @Test
  void shouldReturnSafeProblemDetailForUnexpectedException() {
    var exception = new IllegalStateException("internal token=secret failure");

    ResponseEntity<ProblemDetail> response = handler.handleGenericException(exception, request);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getDetail()).doesNotContain("token=secret");
  }
}
