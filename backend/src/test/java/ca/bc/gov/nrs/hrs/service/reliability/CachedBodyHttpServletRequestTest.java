package ca.bc.gov.nrs.hrs.service.reliability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

@DisplayName("Cached body HTTP servlet request")
class CachedBodyHttpServletRequestTest {

  @Test
  @DisplayName("buffers request body under limit and allows multiple reads")
  void shouldBufferBodyUnderLimit() throws IOException {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/test");
    byte[] content = "{\"message\":\"hello\"}".getBytes(StandardCharsets.UTF_8);
    request.setContent(content);

    CachedBodyHttpServletRequest wrapper = new CachedBodyHttpServletRequest(request);

    assertThat(wrapper.getCachedBody()).isEqualTo(content);
    assertThat(wrapper.getInputStream().readAllBytes()).isEqualTo(content);
    assertThat(wrapper.getInputStream().readAllBytes()).isEqualTo(content);
    assertThat(wrapper.getReader().readLine()).isEqualTo("{\"message\":\"hello\"}");
  }

  @Test
  @DisplayName("rejects request when Content-Length exceeds maximum size limit")
  void shouldRejectWhenContentLengthExceedsLimit() {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/test");
    request.setContent("{}".getBytes(StandardCharsets.UTF_8));
    request.addHeader("Content-Length", "1000");

    assertThatThrownBy(() -> new CachedBodyHttpServletRequest(request, 500))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(ex -> {
          ResponseStatusException rse = (ResponseStatusException) ex;
          assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
          assertThat(rse.getReason()).contains("500 bytes");
        });
  }

  @Test
  @DisplayName("rejects request when stream exceeds limit without Content-Length header")
  void shouldRejectWhenStreamBytesExceedLimit() {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/test");
    byte[] content = "a".repeat(150).getBytes(StandardCharsets.UTF_8);
    request.setContent(content);

    assertThatThrownBy(() -> new CachedBodyHttpServletRequest(request, 100))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(ex -> {
          ResponseStatusException rse = (ResponseStatusException) ex;
          assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
          assertThat(rse.getReason()).contains("100 bytes");
        });
  }

  @Test
  @DisplayName("handles empty request gracefully")
  void shouldHandleEmptyRequest() throws IOException {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/empty");

    CachedBodyHttpServletRequest wrapper = new CachedBodyHttpServletRequest(request);

    assertThat(wrapper.getCachedBody()).isEmpty();
    assertThat(wrapper.getInputStream().readAllBytes()).isEmpty();
  }
}

