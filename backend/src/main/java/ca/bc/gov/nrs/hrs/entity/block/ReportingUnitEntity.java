package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.SoftDeletableAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.Version;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.domain.Persistable;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Locally owned reporting unit for a district-average submission. */
@Entity
@Table(name = "reporting_unit", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true)
@SuppressWarnings("deprecation")
public class ReportingUnitEntity extends SoftDeletableAuditableEntity implements Persistable<Long> {

  @Id
  @SuppressWarnings({"deprecation", "removal"})
  @GenericGenerator(
      name = "reporting_unit_id_generator",
      type = ReportingUnitIdGenerator.class,
      parameters = {
        @org.hibernate.annotations.Parameter(
            name = "sequence_name",
            value = "hrs.reporting_unit_id_seq"),
        @org.hibernate.annotations.Parameter(
            name = "increment_size",
            value = "1")
      })
  @GeneratedValue(generator = "reporting_unit_id_generator")
  @Column(name = "reporting_unit_id")
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "client_number", nullable = false, length = 8)
  private String clientNumber;

  @Column(name = "client_locn_code", nullable = false, length = 32)
  private String clientLocnCode;

  @Column(name = "geographic_code", nullable = false, length = 3)
  private String geographicCode;

  @Column(name = "sampling_code", nullable = false, length = 10)
  private String samplingCode = "AVG";

  @Version
  @Column(nullable = false)
  private Long revision;

  @Transient
  private boolean isNew = true;

  @Override
  public boolean isNew() {
    return isNew || getId() == null;
  }

  @PostLoad
  @PostPersist
  void markNotNew() {
    this.isNew = false;
  }
}
