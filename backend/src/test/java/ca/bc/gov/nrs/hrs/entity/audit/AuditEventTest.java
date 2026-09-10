package ca.bc.gov.nrs.hrs.entity.audit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

/**
 * Unit tests for {@link AuditEvent}.
 */
@DisplayName("Unit Test | Audit Event")
class AuditEventTest {

  @Test
  @DisplayName("Constructor should Set All Fields")
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

  @DisplayName("Constructor should Handle Null Reason And Correlation Id")
  @Test
  void constructor_shouldHandleNullReasonAndCorrelationId() {
    AuditEvent event = new AuditEvent("UPDATE", "test-user", null, null);

    assertThat(event.getReason()).isNull();
    assertThat(event.getCorrelationId()).isNull();
  }

  @DisplayName("Getters should Return Correct Values")
  @Test
  void getters_shouldReturnCorrectValues() {
    AuditEvent event = new AuditEvent("DELETE", "user1", "reason1", "corr1");
    // Use reflection to set id and changedAt for testing getters
    // Note: id is set by JPA, changedAt is set in constructor

    assertThat(event.getAction()).isEqualTo("DELETE");
    assertThat(event.getChangedBy()).isEqualTo("user1");
    assertThat(event.getReason()).isEqualTo("reason1");
    assertThat(event.getCorrelationId()).isEqualTo("corr1");
  }
}
