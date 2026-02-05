package ca.bc.gov.nrs.hrs.entity.reportingunit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.With;

/**
 * Entity representing a reporting unit.
 *
 * <p>Holds the persistent fields for a reporting unit. This entity is used for persistence and
 * may be mapped to the underlying reporting-unit table. Note: the current mapping references
 * THE.ORG_UNIT (preserving existing project mappings).</p>
 */
@Data
@Builder
@With
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(schema = "THE", name = "ORG_UNIT")
public class ReportingUnitEntity {

  /**
   * Primary key for the reporting unit.
   */
  @Id
  @Column(name = "REPORTING_UNIT_ID")
  private Long id;

  /**
   * Organization unit number owning the reporting unit.
   */
  @Column(name = "ORG_UNIT_NO", nullable = false)
  private Long orgUnitNo;

  /**
   * Client location code (2 chars).
   */
  @Column(name = "CLIENT_LOCN_CODE", length = 2, nullable = false)
  private String clientLocationCode;

  /**
   * Client (licencee) number (8 chars).
   */
  @Column(name = "CLIENT_NUMBER", length = 8, nullable = false)
  private String clientNumber;

  /**
   * Sampling option code for the reporting unit.
   */
  @Column(name = "WASTE_SAMPLING_OPTION_CODE", length = 3, nullable = false)
  private String wasteSamplingOptionCode;

  /**
   * Dispersed CV code.
   */
  @Column(name = "WASTE_DISPERSED_CV_CODE", length = 3, nullable = false)
  private String wasteDispersedCvCode;

  /**
   * Accumulated CV code.
   */
  @Column(name = "WASTE_ACCUMULATED_CV_CODE", length = 3, nullable = false)
  private String wasteAccumulatedCvCode;

  /**
   * Appraisal method code.
   */
  @Column(name = "APPRAISAL_METHOD_CODE", length = 1, nullable = false)
  private Character appraisalMethodCode;

  /**
   * Revision counter for optimistic locking / versioning semantics in the app.
   */
  @Column(name = "REVISION_COUNT", nullable = false)
  private Long revision;

  /**
   * User who created the entry.
   */
  @Column(name = "ENTRY_USERID", length = 30, nullable = false)
  private String createdBy;

  /**
   * Creation timestamp.
   */
  @Column(name = "ENTRY_TIMESTAMP", nullable = false)
  private LocalDate createdAt;

  /**
   * User who last updated the entry.
   */
  @Column(name = "UPDATE_USERID", length = 30, nullable = false)
  private String updatedBy;

  /**
   * Last update timestamp.
   */
  @Column(name = "UPDATE_TIMESTAMP", nullable = false)
  private LocalDate updatedAt;


}
