package ca.bc.gov.nrs.hrs.entity.codes;

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
 * This class represents an Organization Unity in the database.
 *
 * <p>Maps to the THE.ORG_UNIT table and contains identifying and hierarchical information
 * about organization units used by the application.</p>
 */
@Data
@Builder
@With
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(schema = "THE", name = "ORG_UNIT")
public class OrgUnitEntity {

  /**
   * Primary key - organization unit number.
   */
  @Id
  @Column(name = "ORG_UNIT_NO")
  private Long orgUnitNo;

  /**
   * Code identifying the org unit.
   */
  @Column(name = "ORG_UNIT_CODE", length = 6, nullable = false)
  private String orgUnitCode;

  /**
   * Human-readable name of the org unit.
   */
  @Column(name = "ORG_UNIT_NAME", length = 100, nullable = false)
  private String orgUnitName;

  /**
   * Location code (3 characters).
   */
  @Column(name = "LOCATION_CODE", length = 3, nullable = false)
  private String locationCode;

  /**
   * Area code (3 characters).
   */
  @Column(name = "AREA_CODE", length = 3, nullable = false)
  private String areaCode;

  /**
   * Telephone number for the org unit.
   */
  @Column(name = "TELEPHONE_NO", length = 7, nullable = false)
  private String telephoneNo;

  /**
   * Organization level code.
   */
  @Column(name = "ORG_LEVEL_CODE", length = 1, nullable = false)
  private Character orgLevelCode;

  /**
   * Office name code.
   */
  @Column(name = "OFFICE_NAME_CODE", length = 2, nullable = false)
  private String officeNameCode;

  /**
   * Rollup region number for hierarchical queries.
   */
  @Column(name = "ROLLUP_REGION_NO", nullable = false)
  private Long rollupRegionNo;

  /**
   * Rollup region code.
   */
  @Column(name = "ROLLUP_REGION_CODE", length = 6, nullable = false)
  private String rollupRegionCode;

  /**
   * Rollup district number.
   */
  @Column(name = "ROLLUP_DIST_NO", nullable = false)
  private Long rollupDistNo;

  /**
   * Rollup district code.
   */
  @Column(name = "ROLLUP_DIST_CODE", length = 6, nullable = false)
  private String rollupDistCode;

  /**
   * Date when the org unit record became effective.
   */
  @Column(name = "EFFECTIVE_DATE", nullable = false)
  private LocalDate effectiveDate;

  /**
   * Date when the org unit record expires.
   */
  @Column(name = "EXPIRY_DATE", nullable = false)
  private LocalDate expiryDate;

  /**
   * Timestamp of the last update to the org unit record.
   */
  @Column(name = "UPDATE_TIMESTAMP", nullable = false)
  private LocalDate updateTimestamp;
}
