package ca.bc.gov.nrs.hrs.entity.reliability;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Reliability entity mappings")
class ReliabilityEntityMappingTest {

  @Test
  @DisplayName("maps idempotency key and response snapshot columns")
  void shouldMapIdempotencyRecord() throws NoSuchFieldException {
    assertThat(IdempotencyRecordEntity.class.isAnnotationPresent(Entity.class)).isTrue();
    assertThat(IdempotencyRecordEntity.class.getAnnotation(Table.class).name())
        .isEqualTo("idempotency_record");
    assertThat(
            IdempotencyRecordEntity.class
                .getDeclaredField("idempotencyKey")
                .getAnnotation(Column.class)
                .length())
        .isEqualTo(256);
    assertThat(IdempotencyRecordEntity.class.getDeclaredField("responseSnapshot").getType())
        .isEqualTo(JsonNode.class);
  }
}
