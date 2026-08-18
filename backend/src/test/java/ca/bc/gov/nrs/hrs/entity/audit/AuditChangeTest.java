package ca.bc.gov.nrs.hrs.entity.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link AuditChange}.
 */
class AuditChangeTest {

  @Test
  void constructor_shouldParseValidJsonStrings() {
    String previousJson = "{\"field1\":\"value1\",\"field2\":123}";
    String currentJson = "{\"field1\":\"value2\",\"field2\":456}";
    String[] changedColumns = {"field1", "field2"};

    AuditChange change = new AuditChange(
        1L, "DISTRICT_VOLUME", 100L, "UPDATE", previousJson, currentJson, changedColumns);

    assertThat(change.getEventId()).isEqualTo(1L);
    assertThat(change.getEntityType()).isEqualTo("DISTRICT_VOLUME");
    assertThat(change.getEntityId()).isEqualTo(100L);
    assertThat(change.getAction()).isEqualTo("UPDATE");
    assertThat(change.getPreviousValues()).isNotNull();
    assertThat(change.getCurrentValues()).isNotNull();
    assertThat(change.getPreviousValues().get("field1").asText()).isEqualTo("value1");
    assertThat(change.getCurrentValues().get("field1").asText()).isEqualTo("value2");
    assertThat(change.getChangedColumns()).containsExactly("field1", "field2");
  }

  @Test
  void constructor_shouldHandleNullJsonValues() {
    AuditChange change = new AuditChange(
        1L, "DISTRICT_VOLUME", 100L, "CREATE", null, null, new String[]{"field1"});

    assertThat(change.getPreviousValues()).isNull();
    assertThat(change.getCurrentValues()).isNull();
  }

  @Test
  void constructor_shouldHandleNullChangedColumns() {
    AuditChange change = new AuditChange(
        1L, "DISTRICT_VOLUME", 100L, "CREATE", "{}", "{}", null);

    assertThat(change.getChangedColumns()).isEmpty();
  }

  @Test
  void constructor_shouldReturnClonedChangedColumns() {
    String[] original = {"field1", "field2"};
    AuditChange change = new AuditChange(
        1L, "DISTRICT_VOLUME", 100L, "UPDATE", "{}", "{}", original);

    String[] returned = change.getChangedColumns();
    returned[0] = "modified";

    assertThat(original[0]).isEqualTo("field1");
  }

  @Test
  void constructor_shouldThrowOnInvalidJson() {
    assertThatThrownBy(() -> new AuditChange(
        1L, "DISTRICT_VOLUME", 100L, "UPDATE", "invalid json", "{}", new String[]{}))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Audit snapshot must be valid JSON");
  }

  @Test
  void getters_shouldReturnCorrectValues() {
    AuditChange change = new AuditChange(
        2L, "SPECIES_COMPOSITION", 200L, "SOFT_DELETE", "{}", "{\"deleted\":true}", new String[]{"deleted"});

    assertThat(change.getEventId()).isEqualTo(2L);
    assertThat(change.getEntityType()).isEqualTo("SPECIES_COMPOSITION");
    assertThat(change.getEntityId()).isEqualTo(200L);
    assertThat(change.getAction()).isEqualTo("SOFT_DELETE");
  }
}
