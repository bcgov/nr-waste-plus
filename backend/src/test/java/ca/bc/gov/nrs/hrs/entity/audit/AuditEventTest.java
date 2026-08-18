package ca.bc.gov.nrs.hrs.entity.audit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link AuditEvent}.
 */
class AuditEventTest {

  @Test
  void constructor_shouldSetAllFields() {
    String action = "CREATE";
    String changedBy = "test-user";
    String reason = "test reason";
    String correlationId = "corr-123";

    AuditEvent event = new AuditEvent(action, changedBy, reason, correlationId);

    assertThat(event.getAction()).isEqualTo(action);
    assertThat(event.getChangedBy()).isEqualTo(changedBy);
    assertThat(event.getReason()).isEqualTo(reason);
    assertThat(event.getCorrelationId()).isEqualTo(correlationId);
    assertThat(event.getChangedAt()).isNotNull();
    assertThat(event.getId()).isNull();
  }

  @Test
  void constructor_shouldHandleNullReasonAndCorrelationId() {
    AuditEvent event = new AuditEvent("UPDATE", "test-user", null, null);

    assertThat(event.getReason()).isNull();
    assertThat(event.getCorrelationId()).isNull();
  }

  @Test
  void getters_shouldReturnCorrectValues() {
    Instant now = Instant.now();
    AuditEvent event = new AuditEvent("DELETE", "user1", "reason1", "corr1");
    // Use reflection to set id and changedAt for testing getters
    // Note: id is set by JPA, changedAt is set in constructor

    assertThat(event.getAction()).isEqualTo("DELETE");
    assertThat(event.getChangedBy()).isEqualTo("user1");
    assertThat(event.getReason()).isEqualTo("reason1");
    assertThat(event.getCorrelationId()).isEqualTo("corr1");
  }
}
