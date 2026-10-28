package ca.bc.gov.nrs.hrs.service.reliability;

import ca.bc.gov.nrs.hrs.entity.reliability.IdempotencyRecordEntity;
import ca.bc.gov.nrs.hrs.exception.IdempotencyConflictException;
import ca.bc.gov.nrs.hrs.repository.reliability.IdempotencyRecordRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service managing request idempotency record claims, completions, and replay detection.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

  public static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
  public static final String STATUS_COMPLETED = "COMPLETED";

  private final IdempotencyRecordRepository repository;

  /**
   * Atomically claims an idempotency key with the given fingerprint, detects replay for completed
   * records with matching fingerprints, or throws a conflict exception if the fingerprint differs
   * or the request is already in progress.
   *
   * @param key the idempotency key
   * @param fingerprint the canonical request fingerprint
   * @return IdempotencyClaimResult indicating whether this is a new claim or a replay
   * @throws IdempotencyConflictException if fingerprint mismatches or request is already
   *     in progress
   */
  @Transactional
  public IdempotencyClaimResult claim(String key, String fingerprint) {
    Optional<IdempotencyRecordEntity> existing = repository.findByIdempotencyKey(key);
    if (existing.isPresent()) {
      IdempotencyRecordEntity record = existing.get();
      if (!record.getRequestFingerprint().equals(fingerprint)) {
        log.warn("Idempotency key '{}' conflict: payload fingerprint mismatch", key);
        throw IdempotencyConflictException.mismatchedFingerprint(key);
      }
      if (STATUS_IN_PROGRESS.equals(record.getStatus())) {
        log.warn("Idempotency key '{}' conflict: request currently in progress", key);
        throw IdempotencyConflictException.inProgress(key);
      }
      if (STATUS_COMPLETED.equals(record.getStatus())) {
        log.info("Idempotency key '{}' matched completed record, replaying response", key);
        int status = record.getResponseStatus() != null ? record.getResponseStatus() : 200;
        return IdempotencyClaimResult.replay(status, record.getResponseSnapshot());
      }
    }

    try {
      IdempotencyRecordEntity newRecord = new IdempotencyRecordEntity();
      newRecord.setIdempotencyKey(key);
      newRecord.setRequestFingerprint(fingerprint);
      newRecord.setStatus(STATUS_IN_PROGRESS);
      if (newRecord.getCreatedBy() == null) {
        newRecord.setCreatedBy("SYSTEM");
      }
      if (newRecord.getUpdatedBy() == null) {
        newRecord.setUpdatedBy("SYSTEM");
      }
      if (newRecord.getCreatedAt() == null) {
        newRecord.setCreatedAt(Instant.now());
      }
      if (newRecord.getUpdatedAt() == null) {
        newRecord.setUpdatedAt(Instant.now());
      }
      repository.save(newRecord);
      log.info("Claimed idempotency key '{}' with status IN_PROGRESS", key);
      return IdempotencyClaimResult.claimed();
    } catch (DataIntegrityViolationException ex) {
      log.warn("Concurrent claim for key '{}' triggered unique constraint", key);
      throw IdempotencyConflictException.inProgress(key);
    }
  }

  /**
   * Completes an in-progress idempotency record by updating its status, response status code,
   * and response snapshot body.
   *
   * @param key the idempotency key
   * @param responseStatus the HTTP status code returned
   * @param responseSnapshot the response payload snapshot (nullable)
   */
  @Transactional
  public void complete(String key, int responseStatus, JsonNode responseSnapshot) {
    IdempotencyRecordEntity record = repository.findByIdempotencyKey(key)
        .orElseThrow(() -> new IllegalStateException(
            "Idempotency record not found for key: " + key));
    record.setStatus(STATUS_COMPLETED);
    record.setResponseStatus(responseStatus);
    record.setResponseSnapshot(responseSnapshot);
    repository.save(record);
    log.info("Completed idempotency key '{}' with HTTP status {}", key, responseStatus);
  }

  /**
   * Releases an in-progress idempotency record when a request terminates with an error, allowing
   * the client to retry without being permanently locked out.
   *
   * @param key the idempotency key
   */
  @Transactional
  public void release(String key) {
    repository.findByIdempotencyKey(key).ifPresent(record -> {
      if (STATUS_IN_PROGRESS.equals(record.getStatus())) {
        repository.delete(record);
        log.info("Released in-progress idempotency record for key '{}'", key);
      }
    });
  }
}

