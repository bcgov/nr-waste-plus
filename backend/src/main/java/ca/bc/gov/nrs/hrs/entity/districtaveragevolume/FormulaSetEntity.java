package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

import ca.bc.gov.nrs.hrs.entity.SoftDeletableAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Independently versioned, date-effective formula configuration. */
@Entity
@Table(name = "formula_set", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class FormulaSetEntity extends SoftDeletableAuditableEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "formula_set_id")
  private Long id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private Area area;

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;
}
