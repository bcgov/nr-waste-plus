package ca.bc.gov.nrs.hrs.service.reliability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.hrs.entity.reliability.IdempotencyRecordEntity;
import ca.bc.gov.nrs.hrs.exception.ForbiddenException;
import ca.bc.gov.nrs.hrs.exception.IdempotencyConflictException;
import ca.bc.gov.nrs.hrs.repository.reliability.IdempotencyRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
@DisplayName("Idempotency service")
class IdempotencyServiceTest {

  @Mock
  private IdempotencyRecordRepository repository;

  private IdempotencyService service;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @BeforeEach
  void setUp() {
    service = new IdempotencyService(repository);
  }

  @Test
  @DisplayName("claims new key successfully with IN_PROGRESS status")
  void shouldClaimNewKey() {
    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.empty());

    IdempotencyClaimResult result = service.claim("key-1", "fingerprint-1");

    assertThat(result.isReplay()).isFalse();

    ArgumentCaptor<IdempotencyRecordEntity> captor =
        ArgumentCaptor.forClass(IdempotencyRecordEntity.class);
    verify(repository).save(captor.capture());

    IdempotencyRecordEntity saved = captor.getValue();
    assertThat(saved.getIdempotencyKey()).isEqualTo("key-1");
    assertThat(saved.getRequestFingerprint()).isEqualTo("fingerprint-1");
    assertThat(saved.getStatus()).isEqualTo(IdempotencyService.STATUS_IN_PROGRESS);
    assertThat(saved.getCreatedBy()).isEqualTo("SYSTEM");
  }

  @Test
  @DisplayName("replays completed record verbatim when fingerprint matches")
  void shouldReplayCompletedRecord() {
    ObjectNode snapshot = objectMapper.createObjectNode();
    snapshot.put("status", "SUBMITTED");

    IdempotencyRecordEntity record = new IdempotencyRecordEntity();
    record.setIdempotencyKey("key-1");
    record.setRequestFingerprint("fingerprint-1");
    record.setStatus(IdempotencyService.STATUS_COMPLETED);
    record.setResponseStatus(200);
    record.setResponseSnapshot(snapshot);

    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

    IdempotencyClaimResult result = service.claim("key-1", "fingerprint-1");

    assertThat(result.isReplay()).isTrue();
    assertThat(result.responseStatus()).isEqualTo(200);
    assertThat(result.responseSnapshot()).isEqualTo(snapshot);
    verify(repository, never()).save(any());
  }

  @Test
  @DisplayName("rejects key replay by different caller with 403 forbidden")
  void shouldRejectReplayByDifferentCaller() {
    IdempotencyRecordEntity record = new IdempotencyRecordEntity();
    record.setIdempotencyKey("key-1");
    record.setRequestFingerprint("fingerprint-1");
    record.setStatus(IdempotencyService.STATUS_COMPLETED);
    record.setCreatedBy("userA");

    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

    assertThatThrownBy(() -> service.claim("key-1", "fingerprint-1", "userB"))
        .isInstanceOf(ForbiddenException.class)
        .hasMessageContaining("Caller is not authorized");

    verify(repository, never()).save(any());
  }

  @Test
  @DisplayName("rejects key reuse with mismatched fingerprint with 409 conflict")
  void shouldRejectFingerprintMismatch() {
    IdempotencyRecordEntity record = new IdempotencyRecordEntity();
    record.setIdempotencyKey("key-1");
    record.setRequestFingerprint("fingerprint-original");
    record.setStatus(IdempotencyService.STATUS_COMPLETED);

    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

    assertThatThrownBy(() -> service.claim("key-1", "fingerprint-different"))
        .isInstanceOf(IdempotencyConflictException.class)
        .hasMessageContaining("already been used with a different request payload");

    verify(repository, never()).save(any());
  }

  @Test
  @DisplayName("rejects duplicate key when another request is currently in progress")
  void shouldRejectConcurrentInProgressKey() {
    IdempotencyRecordEntity record = new IdempotencyRecordEntity();
    record.setIdempotencyKey("key-1");
    record.setRequestFingerprint("fingerprint-1");
    record.setStatus(IdempotencyService.STATUS_IN_PROGRESS);

    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

    assertThatThrownBy(() -> service.claim("key-1", "fingerprint-1"))
        .isInstanceOf(IdempotencyConflictException.class)
        .hasMessageContaining("currently in progress");

    verify(repository, never()).save(any());
  }

  @Test
  @DisplayName("converts unique constraint collision to in-progress conflict exception")
  void shouldHandleConcurrentRaceConstraintViolation() {
    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.empty());
    when(repository.save(any())).thenThrow(new DataIntegrityViolationException("duplicate key"));

    assertThatThrownBy(() -> service.claim("key-1", "fingerprint-1"))
        .isInstanceOf(IdempotencyConflictException.class)
        .hasMessageContaining("currently in progress");
  }

  @Test
  @DisplayName("completes in-progress record with status code and snapshot")
  void shouldCompleteRecord() {
    IdempotencyRecordEntity record = new IdempotencyRecordEntity();
    record.setIdempotencyKey("key-1");
    record.setStatus(IdempotencyService.STATUS_IN_PROGRESS);

    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

    ObjectNode snapshot = objectMapper.createObjectNode();
    snapshot.put("result", "saved");

    service.complete("key-1", 201, snapshot);

    assertThat(record.getStatus()).isEqualTo(IdempotencyService.STATUS_COMPLETED);
    assertThat(record.getResponseStatus()).isEqualTo(201);
    assertThat(record.getResponseSnapshot()).isEqualTo(snapshot);
    verify(repository).save(record);
  }

  @Test
  @DisplayName("releases in-progress record on failure")
  void shouldReleaseInProgressRecord() {
    IdempotencyRecordEntity record = new IdempotencyRecordEntity();
    record.setIdempotencyKey("key-1");
    record.setStatus(IdempotencyService.STATUS_IN_PROGRESS);

    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

    service.release("key-1");

    verify(repository).delete(record);
  }

  @Test
  @DisplayName("does not delete completed record on release")
  void shouldNotDeleteCompletedRecordOnRelease() {
    IdempotencyRecordEntity record = new IdempotencyRecordEntity();
    record.setIdempotencyKey("key-1");
    record.setStatus(IdempotencyService.STATUS_COMPLETED);

    when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(record));

    service.release("key-1");

    verify(repository, never()).delete(record);
  }
}

