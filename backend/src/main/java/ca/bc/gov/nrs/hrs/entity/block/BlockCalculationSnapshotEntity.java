package ca.bc.gov.nrs.hrs.entity.block;

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
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Immutable calculation result captured for a block.
 */
@Entity
@Table(name = "block_calculation_snapshot", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"inputs", "outputs", "warnings"})
public class BlockCalculationSnapshotEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
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

  @CreatedBy
  @Column(nullable = false, length = 128)
  private String createdBy;

  @LastModifiedBy
  @Column(nullable = false, length = 128)
  private String updatedBy;

  @CreatedDate
  @Column(nullable = false)
  private Instant createdAt;

  @LastModifiedDate
  @Column(nullable = false)
  private Instant updatedAt;

  /** Returns the generated snapshot identifier. */
  public Long getId() {
    return id;
  }

  /** Returns the JSON warnings captured with this snapshot. */
  public JsonNode getWarnings() {
    return warnings;
  }

  /** Creates an append-only snapshot with its required calculation payload. */
  public BlockCalculationSnapshotEntity(
      Long blockId,
      Long districtVolumeId,
      JsonNode inputs,
      JsonNode outputs) {
    this.blockId = blockId;
    this.districtVolumeId = districtVolumeId;
    this.inputs = inputs;
    this.outputs = outputs;
  }

  /** Creates a complete immutable snapshot for persistence. */
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
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
