package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Formula expression belonging to an independently versioned formula set. */
@Entity
@Table(name = "formula_set_row", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class FormulaSetRowEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "formula_set_id", nullable = false) private Long formulaSetId;
  @Column(name = "formula_key", nullable = false, length = 128) private String formulaKey;
  @Column(nullable = false, columnDefinition = "text") private String expression;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "declared_variables", nullable = false, columnDefinition = "jsonb")
  private JsonNode declaredVariables = JsonNodeFactory.instance.objectNode();
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "validation_errors", nullable = false, columnDefinition = "jsonb")
  private JsonNode validationErrors = JsonNodeFactory.instance.arrayNode();
  @Column(name = "sort_order", nullable = false) private int sortOrder;
  @Column(nullable = false) private boolean deleted;
  @CreatedDate @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
  @CreatedBy @Column(name = "created_by", nullable = false, updatable = false, length = 128)
  private String createdBy;
  @LastModifiedDate @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
  @LastModifiedBy @Column(name = "updated_by", nullable = false, length = 128)
  private String updatedBy;
}
