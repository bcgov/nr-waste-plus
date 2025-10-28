package ca.bc.gov.nrs.hrs.entity.codes;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Base mapped superclass for simple code tables.
 *
 * <p>This abstract class contains common columns present on many code tables such as a human
 * readable description, effective/expiry dates and an update timestamp. Concrete code-table
 * entities extend this class to inherit these common fields and mappings.</p>
 *
 */
@MappedSuperclass
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public abstract class BaseCodeTableEntity {

  /**
   * Human readable description for the code entry.
   */
  @Column(name = "DESCRIPTION", length = 120, nullable = false)
  private String description;

  /**
   * Moment when this code became effective.
   */
  @Column(name = "EFFECTIVE_DATE", nullable = false)
  private LocalDateTime effectiveDate;

  /**
   * Moment when this code expires and should no longer be considered active.
   */
  @Column(name = "EXPIRY_DATE", nullable = false)
  private LocalDateTime expiryDate;

  /**
   * Timestamp of the last update to the code table row.
   */
  @Column(name = "UPDATE_TIMESTAMP", nullable = false)
  private LocalDateTime updateTimestamp;
}
