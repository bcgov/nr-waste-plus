package ca.bc.gov.nrs.hrs.entity.block;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Locally owned reporting unit for a district-average submission. */
@Entity
@Table(name = "reporting_unit", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class ReportingUnitEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
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
  @Column(name = "created_by", nullable = false, length = 128)
  private String createdBy;
  @Column(name = "updated_by", nullable = false, length = 128)
  private String updatedBy;
  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;
  @Column(nullable = false)
  private boolean deleted;
}
