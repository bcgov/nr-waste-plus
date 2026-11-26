package ca.bc.gov.nrs.hrs.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.server.ResponseStatusException;

@DisplayName("Unit Test | MvcProblemDetailAdvice")
class MvcProblemDetailAdviceTest {

  private final MvcProblemDetailAdvice advice = new MvcProblemDetailAdvice();

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

  @Test
  @DisplayName("sets the request path as instance on a 405 rendered by the base handler")
  void baseHandler_setsInstanceOnMethodNotAllowed() throws Exception {
    MockMvc mockMvc =
        MockMvcBuilders.standaloneSetup(new ProbeController())
            .setControllerAdvice(advice)
            .build();

    mockMvc
        .perform(post("/probe").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isMethodNotAllowed())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.status").value(405))
        .andExpect(jsonPath("$.instance").value("/probe"));
  }

  @Test
  @DisplayName("sets the request path as instance on a 415 rendered by the base handler")
  void baseHandler_setsInstanceOnUnsupportedMediaType() throws Exception {
    MockMvc mockMvc =
        MockMvcBuilders.standaloneSetup(new ProbeController())
            .setControllerAdvice(advice)
            .build();

    mockMvc
        .perform(post("/probe/consume").contentType(MediaType.TEXT_PLAIN).content("x"))
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.status").value(415))
        .andExpect(jsonPath("$.instance").value("/probe/consume"));
  }

  @Test
  @DisplayName("returns null instead of failing when the response is already committed")
  void baseHandler_returnsNullWhenResponseAlreadyCommitted() throws Exception {
    MockHttpServletResponse committed = new MockHttpServletResponse();
    committed.flushBuffer();
    ServletWebRequest request =
        new ServletWebRequest(
            new MockHttpServletRequest("POST", "/api/search/reporting-units"), committed);

    ResponseEntity<Object> response =
        advice.handleException(
            new HttpRequestMethodNotSupportedException("POST", List.of("GET")), request);

    assertThat(response).isNull();
  }

  @RestController
  static class ProbeController {

    @GetMapping("/probe")
    String get() {
      return "ok";
    }

    @PostMapping(value = "/probe/consume", consumes = MediaType.APPLICATION_JSON_VALUE)
    String post() {
      return "ok";
    }
  }
}
