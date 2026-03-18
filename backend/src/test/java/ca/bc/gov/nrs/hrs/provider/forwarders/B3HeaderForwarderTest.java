package ca.bc.gov.nrs.hrs.provider.forwarders;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.TraceContext;
import io.micrometer.tracing.Tracer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.client.MockClientHttpRequest;

@DisplayName("Unit Test | B3HeaderForwarder")
@ExtendWith(MockitoExtension.class)
class B3HeaderForwarderTest {

  @Mock
  private Tracer tracer;

  @Mock
  private Span span;

  @Mock
  private TraceContext traceContext;

  private B3HeaderForwarder forwarder;

  @BeforeEach
  void setup() {
    forwarder = new B3HeaderForwarder(tracer);
  }

  @Test
  @DisplayName("should add X-B3-TraceId and X-B3-SpanId headers when current span exists")
  void shouldAddB3HeadersWhenSpanExists() {
    String traceId = "463ac35c9f6413ad48485a3953bb6124";
    String spanId = "a2fb4a1d1a96d312";

    when(tracer.currentSpan()).thenReturn(span);
    when(span.context()).thenReturn(traceContext);
    when(traceContext.traceId()).thenReturn(traceId);
    when(traceContext.spanId()).thenReturn(spanId);

    MockClientHttpRequest request = new MockClientHttpRequest();
    forwarder.initialize(request);

    HttpHeaders headers = request.getHeaders();
    assertEquals(traceId, headers.getFirst("X-B3-TraceId"));
    assertEquals(spanId, headers.getFirst("X-B3-SpanId"));
  }

  @Test
  @DisplayName("should not add any headers when no current span is available")
  void shouldNotAddHeadersWhenNoSpan() {
    when(tracer.currentSpan()).thenReturn(null);

    MockClientHttpRequest request = new MockClientHttpRequest();
    forwarder.initialize(request);

    HttpHeaders headers = request.getHeaders();
    assertNull(headers.getFirst("X-B3-TraceId"));
    assertNull(headers.getFirst("X-B3-SpanId"));
    assertTrue(headers.isEmpty());
  }
}

