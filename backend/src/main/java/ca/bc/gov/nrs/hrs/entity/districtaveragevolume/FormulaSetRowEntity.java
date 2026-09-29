package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import ca.bc.gov.nrs.hrs.entity.SoftDeletableAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Formula expression belonging to an independently versioned formula set. */
@Entity
@Table(name = "formula_set_row", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class FormulaSetRowEntity extends SoftDeletableAuditableEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "formula_set_row_id")
  private Long id;

  @Column(name = "formula_set_id", nullable = false)
  private Long formulaSetId;

  @Column(name = "formula_key", nullable = false, length = 128)
  private String formulaKey;

  @Column(nullable = false, length = 4000)
  private String expression;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;
}
