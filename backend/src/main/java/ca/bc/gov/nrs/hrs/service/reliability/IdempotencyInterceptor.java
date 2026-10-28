package ca.bc.gov.nrs.hrs.service.reliability;

import ca.bc.gov.nrs.hrs.exception.IdempotencyConflictException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Filter interceptor that wraps mutating HTTP endpoints and manages the Idempotency-Key protocol.
 *
 * <p>Key claim, response replay, conflict detection, and snapshot persistence are coordinated
 * atomically with the request lifecycle.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
@RequiredArgsConstructor
@Slf4j
public class IdempotencyInterceptor extends OncePerRequestFilter {

  public static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
  public static final int MAX_KEY_LENGTH = 256;

  private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

  private final IdempotencyService idempotencyService;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain)
      throws ServletException, IOException {

    String idempotencyKey = request.getHeader(IDEMPOTENCY_KEY_HEADER);

    if (idempotencyKey == null
        || idempotencyKey.isBlank()
        || !MUTATING_METHODS.contains(request.getMethod().toUpperCase(Locale.ROOT))) {
      filterChain.doFilter(request, response);
      return;
    }

    String trimmedKey = idempotencyKey.trim();
    if (trimmedKey.length() > MAX_KEY_LENGTH) {
      writeProblemDetail(
          response,
          request.getRequestURI(),
          HttpStatus.BAD_REQUEST,
          "Idempotency-Key header length must not exceed " + MAX_KEY_LENGTH + " characters.");
      return;
    }

    CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);
    ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

    String fingerprint = IdempotencyFingerprinter.computeFingerprint(
        wrappedRequest, wrappedRequest.getCachedBody());

    IdempotencyClaimResult claim;
    try {
      claim = idempotencyService.claim(trimmedKey, fingerprint);
    } catch (IdempotencyConflictException ex) {
      writeProblemDetail(
          response,
          request.getRequestURI(),
          HttpStatus.CONFLICT,
          ex.getReason());
      return;
    }

    if (claim.isReplay()) {
      replayResponse(response, claim);
      return;
    }

    boolean completedSuccessfully = false;
    try {
      filterChain.doFilter(wrappedRequest, wrappedResponse);
      int statusCode = wrappedResponse.getStatus();
      if (statusCode >= 200 && statusCode < 300) {
        JsonNode snapshot = parseJsonOrNull(wrappedResponse.getContentAsByteArray());
        idempotencyService.complete(trimmedKey, statusCode, snapshot);
        completedSuccessfully = true;
      } else {
        idempotencyService.release(trimmedKey);
      }
    } catch (Exception ex) {
      idempotencyService.release(trimmedKey);
      wrappedResponse.copyBodyToResponse();
      throw ex;
    } finally {
      if (!completedSuccessfully) {
        // Ensure in-progress record is cleaned up if uncommitted or failed
        idempotencyService.release(trimmedKey);
      }
      wrappedResponse.copyBodyToResponse();
    }
  }

  private void replayResponse(
      HttpServletResponse response, IdempotencyClaimResult claim) throws IOException {
    int status = claim.responseStatus() != null ? claim.responseStatus() : HttpStatus.OK.value();
    response.setStatus(status);
    if (claim.responseSnapshot() != null) {
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());
      byte[] snapshotBytes = objectMapper.writeValueAsBytes(claim.responseSnapshot());
      response.getOutputStream().write(snapshotBytes);
    }
  }

  private JsonNode parseJsonOrNull(byte[] content) {
    if (content == null || content.length == 0) {
      return null;
    }
    try {
      return objectMapper.readTree(content);
    } catch (Exception ex) {
      log.debug("Response body is not valid JSON, snapshot will be null: {}", ex.getMessage());
      return null;
    }
  }

  private void writeProblemDetail(
      HttpServletResponse response,
      String instanceUri,
      HttpStatus status,
      String detail)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());

    ProblemDetail problem = ProblemDetail.forStatus(status);
    problem.setTitle(
        status == HttpStatus.CONFLICT ? "Idempotency Conflict" : status.getReasonPhrase());
    problem.setDetail(detail);
    problem.setInstance(URI.create(instanceUri));

    objectMapper.writeValue(response.getOutputStream(), problem);
  }
}

