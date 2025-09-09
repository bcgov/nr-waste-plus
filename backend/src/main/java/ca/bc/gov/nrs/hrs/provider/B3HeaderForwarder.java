package ca.bc.gov.nrs.hrs.provider;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import lombok.RequiredArgsConstructor;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestInitializer;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class B3HeaderForwarder implements ClientHttpRequestInitializer {

  private final Tracer tracer;

  @Override
  public void initialize(ClientHttpRequest request) {
    Span currentSpan = tracer.currentSpan();
    if (currentSpan != null) {
      request.getHeaders().add("X-B3-TraceId", currentSpan.context().traceId());
      request.getHeaders().add("X-B3-SpanId", currentSpan.context().spanId());
    }
  }
}
