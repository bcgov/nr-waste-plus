package ca.bc.gov.nrs.hrs.entity.codes;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@MappedSuperclass
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public abstract class BaseCodeTableEntity {

  @Column(name = "DESCRIPTION", length = 120, nullable = false)
  private String description;

  @Column(name = "EFFECTIVE_DATE", nullable = false)
  private LocalDateTime effectiveDate;

  @Column(name = "EXPIRY_DATE", nullable = false)
  private LocalDateTime expiryDate;

  @Column(name = "UPDATE_TIMESTAMP", nullable = false)
  private LocalDateTime updateTimestamp;
}
