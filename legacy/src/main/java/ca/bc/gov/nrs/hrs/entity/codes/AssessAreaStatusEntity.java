package ca.bc.gov.nrs.hrs.entity.codes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.With;
import lombok.experimental.SuperBuilder;

/**
 * Entity representing assessment-area status codes.
 *
 * <p>Maps to the THE.WASTE_ASSESS_AREA_STS_CODE table and extends {@link BaseCodeTableEntity}
 * to inherit common code-table fields such as description and effective dates.</p>
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@With
@Table(schema = "THE", name = "WASTE_ASSESS_AREA_STS_CODE")
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class AssessAreaStatusEntity extends BaseCodeTableEntity {

  /**
   * The code identifier for the assess-area status.
   */
  @Id
  @Column(name = "WASTE_ASSESS_AREA_STS_CODE", length = 4, nullable = false)
  @EqualsAndHashCode.Include
  private String id;

}
