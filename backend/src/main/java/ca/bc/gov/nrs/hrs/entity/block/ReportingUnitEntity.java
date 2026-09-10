package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.SoftDeletableAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Locally owned reporting unit for a district-average submission.
 */
@Entity
@Table(name = "reporting_unit", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true)
public class ReportingUnitEntity extends SoftDeletableAuditableEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "reporting_unit_id")
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "client_number", nullable = false, length = 8)
  private String clientNumber;

  @Column(name = "client_locn_code", nullable = false, length = 32)
  private String clientLocnCode;

  @Column(name = "org_unit_no", nullable = false, length = 3)
  private String orgUnitNo;

  @Version
  @Column(nullable = false)
  private Long revision;
}
