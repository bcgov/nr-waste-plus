package ca.bc.gov.nrs.hrs.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when a downstream service indicates too many requests.
 *
 * <p>This extends {@link RetriableException} and is annotated with
 * {@link ResponseStatus} to map to HTTP 429 (Too Many Requests). The
 * constructor accepts a retry-after value which is included in the message.
 * </p>
 */
@ResponseStatus(value = HttpStatus.TOO_MANY_REQUESTS)
public class TooManyRequestsException extends RetriableException {

  /**
   * Constructs a new TooManyRequestsException with the specified entity and retry-after value.
   *
   * @param entity     the entity that had too many requests
   * @param retryAfter the retry-after value indicating when to retry
   */
  public TooManyRequestsException(String entity, String retryAfter) {
    super(
        HttpStatus.TOO_MANY_REQUESTS,
        String.format("%s had too many requests, retry after %s",
            entity, retryAfter
        )
    );
  }
}
