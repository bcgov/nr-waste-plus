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
 * Entity representing sampling option codes used for waste sampling configurations.
 *
 * <p>Extends {@link BaseCodeTableEntity} to inherit common code-table fields like description
 * and effective dates. Maps to THE.WASTE_SAMPLING_OPTION_CODE.</p>
 */
@Data
@SuperBuilder
@With
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(schema = "THE", name = "WASTE_SAMPLING_OPTION_CODE")
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class SamplingOptionEntity extends BaseCodeTableEntity {

  /**
   * Sampling option code identifier.
   */
  @Id
  @Column(name = "WASTE_SAMPLING_OPTION_CODE", length = 3, nullable = false)
  private String id;

}
