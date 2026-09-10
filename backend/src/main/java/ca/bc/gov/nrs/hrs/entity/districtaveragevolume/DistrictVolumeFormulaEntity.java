package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import ca.bc.gov.nrs.hrs.entity.AuditableEntity;
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
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** A normalized administrator-managed formula associated with one table version. */
@Entity
@Table(name = "district_volume_formula", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true, exclude = "districtVolume")
public class DistrictVolumeFormulaEntity extends AuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "district_volume_formula_id")
  @EqualsAndHashCode.Include
  private Long id;

  @ManyToOne
  @JoinColumn(name = "district_volume_id", nullable = false)
  private DistrictVolumeEntity districtVolume;

  @Column(name = "formula_key", nullable = false, length = 128)
  private String formulaKey;

  @Column(nullable = false, length = 4000)
  private String expression;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "declared_variables", nullable = false, columnDefinition = "jsonb")
  private JsonNode declaredVariables = JsonNodeFactory.instance.objectNode();

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "validation_errors", nullable = false, columnDefinition = "jsonb")
  private JsonNode validationErrors = JsonNodeFactory.instance.arrayNode();

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;
}
