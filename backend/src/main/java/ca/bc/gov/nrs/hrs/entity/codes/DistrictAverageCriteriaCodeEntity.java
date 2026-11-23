package ca.bc.gov.nrs.hrs.entity.codes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Code table entity for district average criteria options (Waste manual section 4.5). */
@Entity
@Table(name = "district_average_criteria_code", schema = "wasteplus")
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
public class DistrictAverageCriteriaCodeEntity {

  @Id
  @Column(name = "code", nullable = false, length = 2)
  @EqualsAndHashCode.Include
  private String code;

  @Column(name = "description", nullable = false, length = 1000)
  private String description;

  @Column(name = "effective_date", nullable = false)
  private LocalDateTime effectiveDate;

  @Column(name = "expiry_date", nullable = false)
  private LocalDateTime expiryDate;

  @Column(name = "update_timestamp", nullable = false)
  private LocalDateTime updateTimestamp;
}
