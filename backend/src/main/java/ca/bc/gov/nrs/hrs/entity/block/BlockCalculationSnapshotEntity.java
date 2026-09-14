package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.AuditableEntity;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Immutable calculation result captured for a block. */
@Entity
@Table(name = "block_calculation_snapshot", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(
    callSuper = true,
    exclude = {"inputs", "outputs", "warnings"})
public class BlockCalculationSnapshotEntity extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "block_calculation_snapshot_id")
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "block_id", nullable = false)
  private Long blockId;

  @Column(name = "district_volume_id", nullable = false)
  private Long districtVolumeId;

  private LocalDate hbsWindowStart;

  private LocalDate hbsWindowEnd;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private JsonNode inputs;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(nullable = false, columnDefinition = "jsonb")
  private JsonNode outputs;

  private Instant calculatedAt;

  @Column(length = 64)
  private String roundingPolicy;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private JsonNode warnings;

  /** Returns the generated snapshot identifier. */
  public Long getId() {
    return id;
  }

  /** Returns the JSON warnings captured with this snapshot. */
  public JsonNode getWarnings() {
    return warnings;
  }

  /** Creates a complete immutable snapshot for persistence. */
  @SuppressWarnings("java:S107") // Complete persistence construction requires every mapped field.
  public BlockCalculationSnapshotEntity(
      Long blockId,
      Long districtVolumeId,
      LocalDate hbsWindowStart,
      LocalDate hbsWindowEnd,
      JsonNode inputs,
      JsonNode outputs,
      Instant calculatedAt,
      String roundingPolicy,
      JsonNode warnings,
      String createdBy,
      String updatedBy,
      Instant createdAt,
      Instant updatedAt) {
    this.blockId = blockId;
    this.districtVolumeId = districtVolumeId;
    this.hbsWindowStart = hbsWindowStart;
    this.hbsWindowEnd = hbsWindowEnd;
    this.inputs = inputs;
    this.outputs = outputs;
    this.calculatedAt = calculatedAt;
    this.roundingPolicy = roundingPolicy;
    this.warnings = warnings;
    setCreatedBy(createdBy);
    setUpdatedBy(updatedBy);
    setCreatedAt(createdAt);
    setUpdatedAt(updatedAt);
  }
}
