package ca.bc.gov.nrs.hrs.service.reliability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Idempotency fingerprinter")
class IdempotencyFingerprinterTest {

  @Test
  @DisplayName("produces identical fingerprint for JSON objects with different key order")
  void shouldNormalizeJsonKeyOrdering() {
    HttpServletRequest request1 = mockRequest("POST", "/api/test", null);
    HttpServletRequest request2 = mockRequest("POST", "/api/test", null);

    byte[] body1 = "{\"name\":\"item\",\"count\":10,\"active\":true}".getBytes(
        StandardCharsets.UTF_8);
    byte[] body2 = "{\"active\":true,\"count\":10,\"name\":\"item\"}".getBytes(
        StandardCharsets.UTF_8);

    String fp1 = IdempotencyFingerprinter.computeFingerprint(request1, body1);
    String fp2 = IdempotencyFingerprinter.computeFingerprint(request2, body2);

    assertThat(fp1).isEqualTo(fp2);
    assertThat(fp1).hasSize(64);
  }

  @Test
  @DisplayName("produces different fingerprint for different payload")
  void shouldDistinguishDifferentPayloads() {
    HttpServletRequest request = mockRequest("POST", "/api/test", null);

    byte[] body1 = "{\"name\":\"itemA\"}".getBytes(StandardCharsets.UTF_8);
    byte[] body2 = "{\"name\":\"itemB\"}".getBytes(StandardCharsets.UTF_8);

    String fp1 = IdempotencyFingerprinter.computeFingerprint(request, body1);
    String fp2 = IdempotencyFingerprinter.computeFingerprint(request, body2);

    assertThat(fp1).isNotEqualTo(fp2);
  }

  @Test
  @DisplayName("produces different fingerprint for different HTTP methods")
  void shouldDistinguishDifferentMethods() {
    HttpServletRequest reqPost = mockRequest("POST", "/api/test", null);
    HttpServletRequest reqPut = mockRequest("PUT", "/api/test", null);

    byte[] body = "{\"name\":\"item\"}".getBytes(StandardCharsets.UTF_8);

    String fpPost = IdempotencyFingerprinter.computeFingerprint(reqPost, body);
    String fpPut = IdempotencyFingerprinter.computeFingerprint(reqPut, body);

    assertThat(fpPost).isNotEqualTo(fpPut);
  }

  @Test
  @DisplayName("produces different fingerprint for different query string")
  void shouldIncludeQueryStringInFingerprint() {
    HttpServletRequest req1 = mockRequest("POST", "/api/test", "filter=active");
    HttpServletRequest req2 = mockRequest("POST", "/api/test", "filter=all");

    byte[] body = "{\"name\":\"item\"}".getBytes(StandardCharsets.UTF_8);

    String fp1 = IdempotencyFingerprinter.computeFingerprint(req1, body);
    String fp2 = IdempotencyFingerprinter.computeFingerprint(req2, body);

    assertThat(fp1).isNotEqualTo(fp2);
  }

  @Test
  @DisplayName("handles empty or null body gracefully")
  void shouldHandleEmptyOrNullBody() {
    HttpServletRequest request = mockRequest("POST", "/api/empty", null);

    String fpNull = IdempotencyFingerprinter.computeFingerprint(request, null);
    String fpEmpty = IdempotencyFingerprinter.computeFingerprint(request, new byte[0]);

    assertThat(fpNull).isEqualTo(fpEmpty);
    assertThat(fpNull).hasSize(64);
  }

  @Test
  @DisplayName("handles non-JSON body gracefully")
  void shouldHandleNonJsonBody() {
    HttpServletRequest request = mockRequest("POST", "/api/plain", null);

    byte[] body = "raw-unstructured-text".getBytes(StandardCharsets.UTF_8);
    String fp = IdempotencyFingerprinter.computeFingerprint(request, body);

    assertThat(fp).hasSize(64);
  }

  private HttpServletRequest mockRequest(String method, String uri, String query) {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getMethod()).thenReturn(method);
    when(request.getRequestURI()).thenReturn(uri);
    when(request.getQueryString()).thenReturn(query);
    return request;
  }
}

