package ca.bc.gov.nrs.hrs.entity.reliability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Table;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Reliability entity mappings")
class ReliabilityEntityMappingTest {

  @Test
  @DisplayName("maps outbox infrastructure columns and audit listener")
  void shouldMapOutboxEvent() throws NoSuchFieldException {
    assertThat(OutboxEventEntity.class.isAnnotationPresent(Entity.class)).isTrue();
    assertThat(OutboxEventEntity.class.getAnnotation(Table.class).name()).isEqualTo("outbox_event");
    assertThat(OutboxEventEntity.class.getAnnotation(Table.class).schema()).isEqualTo("hrs");
    assertThat(OutboxEventEntity.class.isAnnotationPresent(EntityListeners.class)).isTrue();
    assertThat(OutboxEventEntity.class.getDeclaredField("eventId")
        .getAnnotation(Column.class).unique()).isTrue();
    assertThat(OutboxEventEntity.class.getDeclaredField("attemptHistory")
        .getType()).isEqualTo(JsonNode.class);
    assertThat(OutboxEventEntity.class.getDeclaredField("nextRetryAt")
        .getType()).isEqualTo(Instant.class);
  }

  @Test
  @DisplayName("defaults attempt history but requires an explicit payload")
  void shouldDefaultAttemptHistoryAndRequirePayload_whenUsingNoArgsConstructor() {
    OutboxEventEntity entity = new OutboxEventEntity();

    assertThat(entity.getAttemptHistory())
        .isEqualTo(JsonNodeFactory.instance.arrayNode());
    assertThatThrownBy(entity::validateRequiredJsonFields)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Outbox event payload must be provided");
  }

  @Test
  @DisplayName("preserves all-args JSON values and rejects explicitly null required fields")
  void shouldPreserveAllArgsValuesAndRejectNulls_whenConstructedWithAllArgs() {
    JsonNode payload = JsonNodeFactory.instance.objectNode().put("kind", "test");
    JsonNode attemptHistory = JsonNodeFactory.instance.arrayNode().add("attempted");
    OutboxEventEntity entity = new OutboxEventEntity(
        null, null, null, null, null, payload, null, null, attemptHistory, null, null, null,
        null, null, null, null);

    assertThat(entity.getPayload()).isSameAs(payload);
    assertThat(entity.getAttemptHistory()).isSameAs(attemptHistory);
    entity.validateRequiredJsonFields();

    entity.setPayload(null);
    assertThatThrownBy(entity::validateRequiredJsonFields)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Outbox event payload must be provided");

    entity.setPayload(payload);
    entity.setAttemptHistory(null);
    assertThatThrownBy(entity::validateRequiredJsonFields)
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Outbox event attempt history must be provided");
  }

  @Test
  @DisplayName("maps idempotency key and response snapshot columns")
  void shouldMapIdempotencyRecord() throws NoSuchFieldException {
    assertThat(IdempotencyRecordEntity.class.isAnnotationPresent(Entity.class)).isTrue();
    assertThat(IdempotencyRecordEntity.class.getAnnotation(Table.class).name())
        .isEqualTo("idempotency_record");
    assertThat(IdempotencyRecordEntity.class.getDeclaredField("idempotencyKey")
        .getAnnotation(Column.class).length()).isEqualTo(256);
    assertThat(IdempotencyRecordEntity.class.getDeclaredField("responseSnapshot")
        .getType()).isEqualTo(JsonNode.class);
  }
}
