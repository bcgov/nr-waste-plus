package ca.bc.gov.nrs.hrs.entity.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.json.JsonMapper;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Per-row audit change with JSONB snapshots.
 * No foreign key on entity_id — polymorphic audit.
 */
@Entity
@Table(name = "audit_change", schema = "hrs")
@Getter
public class AuditChange {

  private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "event_id", nullable = false)
  private Long eventId;

  @Column(name = "entity_type", nullable = false, length = 64)
  private String entityType;

  @Column(name = "entity_id", nullable = false)
  private Long entityId;

  @Column(nullable = false, length = 32)
  private String action;

  @Column(name = "previous_values", columnDefinition = "jsonb")
  @JdbcTypeCode(SqlTypes.JSON)
  private JsonNode previousValues;

  @Column(name = "current_values", columnDefinition = "jsonb")
  @JdbcTypeCode(SqlTypes.JSON)
  private JsonNode currentValues;

  @Column(name = "changed_columns", columnDefinition = "text[]")
  private String[] changedColumns;

  protected AuditChange() {}

  /**
   * Creates an audit change capturing the before and after state of one row.
   *
   * @param eventId the owning audit event id
   * @param entityType the audited entity type
   * @param entityId the audited entity id
   * @param action the mutation action
   * @param previousValues the prior row state as JSON
   * @param currentValues the new row state as JSON
   * @param changedColumns the columns that changed
   */
  public AuditChange(Long eventId, String entityType, Long entityId, String action,
       String previousValues, String currentValues, String[] changedColumns) {
    this.eventId = eventId;
    this.entityType = entityType;
    this.entityId = entityId;
    this.action = action;
    this.previousValues = parseJson(previousValues);
    this.currentValues = parseJson(currentValues);
    this.changedColumns = changedColumns != null ? changedColumns : new String[0];
  }

  /**
   * Defensive copy of the changed columns, or an empty array when none recorded.
   *
   * @return a fresh array of changed columns, or an empty array when none recorded
   */
  public String[] getChangedColumns() {
    return changedColumns != null ? changedColumns.clone() : new String[0];
  }

  private static JsonNode parseJson(String value) {
    if (value == null) {
      return null;
    }
    try {
      return JSON_MAPPER.readTree(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalArgumentException("Audit snapshot must be valid JSON", exception);
    }
  }
}