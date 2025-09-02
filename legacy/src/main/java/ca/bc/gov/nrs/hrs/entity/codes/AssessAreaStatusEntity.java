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

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@With
@Table(schema = "THE", name = "WASTE_ASSESS_AREA_STS_CODE")
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class AssessAreaStatusEntity extends BaseCodeTableEntity {

  @Id
  @Column(name = "WASTE_ASSESS_AREA_STS_CODE", length = 4, nullable = false)
  @EqualsAndHashCode.Include
  private String id;

}
