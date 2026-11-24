package ca.bc.gov.nrs.hrs.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

@DisplayName("Unit Test | ResponseStatusExceptionAdvice")
class ResponseStatusExceptionAdviceTest {

  private final ResponseStatusExceptionAdvice advice = new ResponseStatusExceptionAdvice();

  @Test
  @DisplayName("sets the request path as instance and keeps the status and reason")
  void handleResponseStatusException_setsRequestPathAsInstance() {
    MockHttpServletRequest request =
        new MockHttpServletRequest("GET", "/api/search/reporting-units");
    ResponseStatusException ex =
        new ResponseStatusException(
            HttpStatus.PRECONDITION_REQUIRED, "Field invalidField is not a valid sorting field.");

    ResponseEntity<ProblemDetail> response = advice.handleResponseStatusException(ex, request);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PRECONDITION_REQUIRED);
    assertThat(response.getHeaders().getContentType())
        .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
    ProblemDetail body = response.getBody();
    assertThat(body).isNotNull();
    assertThat(body.getInstance()).isEqualTo(URI.create("/api/search/reporting-units"));
    assertThat(body.getTitle()).isEqualTo("Precondition Required");
    assertThat(body.getDetail())
        .isEqualTo("Field invalidField is not a valid sorting field.");
  }
}
