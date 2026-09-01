package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** A normalized administrator-managed formula associated with one table version. */
@Entity
@Table(name = "district_volume_formula", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = "districtVolume")
public class DistrictVolumeFormulaEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne
  @JoinColumn(name = "district_volume_id", nullable = false)
  private DistrictVolumeEntity districtVolume;

  @Column(name = "formula_key", nullable = false, length = 128)
  private String formulaKey;

  @Column(nullable = false, columnDefinition = "text")
  private String expression;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "declared_variables", nullable = false, columnDefinition = "jsonb")
  private JsonNode declaredVariables = JsonNodeFactory.instance.objectNode();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "validation_errors", nullable = false, columnDefinition = "jsonb")
  private JsonNode validationErrors = JsonNodeFactory.instance.arrayNode();

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @CreatedBy
  @Column(nullable = false, updatable = false, length = 128)
  private String createdBy;

  @LastModifiedDate
  @Column(nullable = false)
  private Instant updatedAt;

  @LastModifiedBy
  @Column(nullable = false, length = 128)
  private String updatedBy;
}
