package ca.bc.gov.nrs.hrs.service.reliability;

import ca.bc.gov.nrs.hrs.util.JwtPrincipalUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Filter interceptor that wraps mutating HTTP endpoints and manages the Idempotency-Key protocol.
 *
 * <p>Key claim, response replay, conflict detection, and snapshot persistence are coordinated
 * atomically with the request lifecycle for local database transactions. Handlers that orchestrate
 * external remote writes provide service-level reconciliation to maintain consistency across
 * retries without distributed two-phase commit.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
@RequiredArgsConstructor
@Slf4j
public class IdempotencyInterceptor extends OncePerRequestFilter {

  public static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
  public static final int MAX_KEY_LENGTH = 256;
  public static final int MAX_BODY_SIZE_BYTES =
      CachedBodyHttpServletRequest.DEFAULT_MAX_BODY_SIZE_BYTES;

  private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
  private static final Set<String> PERSISTED_RESPONSE_HEADERS = Set.of(
      HttpHeaders.LOCATION,
      HttpHeaders.ETAG,
      HttpHeaders.LAST_MODIFIED
  );

  private final IdempotencyService idempotencyService;
  private final PlatformTransactionManager transactionManager;
  private final EndpointAuthorizationChecker authorizationChecker;
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

    CachedBodyHttpServletRequest wrappedRequest;
    try {
      wrappedRequest = new CachedBodyHttpServletRequest(request, MAX_BODY_SIZE_BYTES);
    } catch (ResponseStatusException ex) {
      HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
      writeProblemDetail(
          response,
          request.getRequestURI(),
          status,
          ex.getReason());
      return;
    }
    ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

    String callerId = resolveCallerId();
    String fingerprint = IdempotencyFingerprinter.computeFingerprint(
        wrappedRequest, wrappedRequest.getCachedBody(), callerId);

    TransactionDefinition txDef = new DefaultTransactionDefinition();
    TransactionStatus txStatus = transactionManager.getTransaction(txDef);

    IdempotencyClaimResult claim;
    try {
      claim = idempotencyService.claim(trimmedKey, fingerprint, callerId);
    } catch (ResponseStatusException ex) {
      transactionManager.rollback(txStatus);
      HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
      writeProblemDetail(
          response,
          request.getRequestURI(),
          status,
          ex.getReason());
      return;
    } catch (Exception ex) {
      transactionManager.rollback(txStatus);
      throw ex;
    }

    if (claim.isReplay()) {
      transactionManager.rollback(txStatus);
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();
      try {
        authorizationChecker.checkAuthorization(wrappedRequest, auth);
      } catch (ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        writeProblemDetail(
            response,
            request.getRequestURI(),
            status,
            ex.getReason());
        return;
      }
      replayResponse(response, claim);
      return;
    }

    try {
      filterChain.doFilter(wrappedRequest, wrappedResponse);
      int statusCode = wrappedResponse.getStatus();
      if (statusCode >= 200 && statusCode < 300) {
        JsonNode snapshot = parseJsonOrNull(wrappedResponse.getContentAsByteArray());
        Map<String, String> responseHeaders = extractHeadersToPersist(wrappedResponse);
        idempotencyService.complete(trimmedKey, statusCode, responseHeaders, snapshot);
        transactionManager.commit(txStatus);
      }
    } catch (Exception ex) {
      log.error(
          "Failed to coordinate idempotency transaction for key '{}': {}",
          trimmedKey,
          ex.getMessage(),
          ex);
      writeProblemDetail(
          response,
          request.getRequestURI(),
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to process idempotency transaction: " + ex.getMessage());
      return;
    } finally {
      if (!txStatus.isCompleted()) {
        transactionManager.rollback(txStatus);
      }
      wrappedResponse.copyBodyToResponse();
    }
  }

  private void replayResponse(
      HttpServletResponse response, IdempotencyClaimResult claim) throws IOException {
    int status = claim.responseStatus() != null ? claim.responseStatus() : HttpStatus.OK.value();
    response.setStatus(status);
    if (claim.responseHeaders() != null) {
      claim.responseHeaders().forEach(response::setHeader);
    }
    if (claim.responseSnapshot() != null) {
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());
      byte[] snapshotBytes = objectMapper.writeValueAsBytes(claim.responseSnapshot());
      response.getOutputStream().write(snapshotBytes);
    }
  }

  private Map<String, String> extractHeadersToPersist(HttpServletResponse response) {
    Map<String, String> headers = new LinkedHashMap<>();
    for (String headerName : response.getHeaderNames()) {
      if (headerName == null) {
        continue;
      }
      for (String persistedName : PERSISTED_RESPONSE_HEADERS) {
        if (persistedName.equalsIgnoreCase(headerName)) {
          String value = response.getHeader(headerName);
          if (value != null) {
            headers.put(persistedName, value);
          }
        }
      }
    }
    return headers;
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

  private String resolveCallerId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.isAuthenticated()) {
      if (auth.getPrincipal() instanceof Jwt jwt) {
        String userId = JwtPrincipalUtil.getUserId(jwt);
        return StringUtils.isNotBlank(userId) ? userId : jwt.getSubject();
      }
      String name = auth.getName();
      return StringUtils.isNotBlank(name) ? name : null;
    }
    return null;
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
    if (status == HttpStatus.CONFLICT) {
      problem.setTitle("Idempotency Conflict");
    } else if (status == HttpStatus.FORBIDDEN) {
      problem.setTitle("Forbidden");
    } else {
      problem.setTitle(status.getReasonPhrase());
    }
    problem.setDetail(detail);
    problem.setInstance(URI.create(instanceUri));

    objectMapper.writeValue(response.getOutputStream(), problem);
  }
}

