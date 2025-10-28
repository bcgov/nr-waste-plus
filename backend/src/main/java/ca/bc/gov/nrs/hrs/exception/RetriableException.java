package ca.bc.gov.nrs.hrs.exception;

import java.time.Duration;
import java.util.Optional;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.server.ResponseStatusException;

/**
 * Exception for downstream failures that may be retried after a suggested
 * delay.
 *
 * <p>
 * The exception can capture a {@code Retry-After} value—either a number of
 * seconds or an HTTP-date—and exposes it as an {@link Optional}{@code <Duration>}.
 * </p>
 */
public class RetriableException extends ResponseStatusException {
  private final Duration retryAfter;

  public RetriableException(HttpStatusCode status, String value, String retryAfter) {
    super(status,
        String.format(
            "Request failed with status %s: cannot retrieve data with parameter %s, retry after %s",
            status, value, retryAfter));
    this.retryAfter = parseRetryAfter(retryAfter);
  }

  public RetriableException(HttpStatusCode status, String message) {
    super(status, message);
    this.retryAfter = Duration.ofSeconds(10); // Default retry after 10 seconds
  }

  /**
   * Get the parsed retry-after duration if available.
   *
   * @return an Optional containing the suggested retry delay
   */
  public Optional<Duration> getRetryAfter() {
    return Optional.ofNullable(retryAfter);
  }

  private Duration parseRetryAfter(String header) {
    if (header == null) return null;
    try {
      // Retry-After can be seconds or HTTP-date
      if (header.matches("\\d+")) {
        return Duration.ofSeconds(Long.parseLong(header));
      } else {
        var date = java.time.ZonedDateTime.parse(header, java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME);
        return Duration.between(java.time.ZonedDateTime.now(), date);
      }
    } catch (Exception e) {
      return null;
    }
  }
}
