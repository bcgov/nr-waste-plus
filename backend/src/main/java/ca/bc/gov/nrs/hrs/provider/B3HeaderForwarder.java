package ca.bc.gov.nrs.hrs.provider;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestInitializer;
import org.springframework.stereotype.Component;

/**
 * Client request initializer that forwards B3 tracing headers (X-B3-TraceId and
 * X-B3-SpanId) from the current Micrometer {@link Span} to outgoing requests.
 *
 * <p>
 * When a current span is available from the configured {@link Tracer}, this
 * initializer reads the trace and span ids and adds them as headers on the
 * {@link ClientHttpRequest} so downstream services can participate in the
 * distributed trace.
 * </p>
 */
@Component
@RequiredArgsConstructor
public class B3HeaderForwarder implements ClientHttpRequestInitializer {

  @NonNull
  private final Tracer tracer;

  @Override
  public void initialize(@NonNull ClientHttpRequest request) {
    Span currentSpan = tracer.currentSpan();
    if (currentSpan != null) {
      request.getHeaders().add("X-B3-TraceId", currentSpan.context().traceId());
      request.getHeaders().add("X-B3-SpanId", currentSpan.context().spanId());
    }
  }
}
