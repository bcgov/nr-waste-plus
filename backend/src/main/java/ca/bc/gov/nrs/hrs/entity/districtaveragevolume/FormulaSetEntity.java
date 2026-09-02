package ca.bc.gov.nrs.hrs.entity.districtaveragevolume;

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
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Independently versioned, date-effective formula configuration. */
@Entity
@Table(name = "formula_set", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class FormulaSetEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private Area area;
  @Column(name = "start_date", nullable = false) private LocalDate startDate;
  @Column(name = "end_date") private LocalDate endDate;
  @Column(nullable = false) private boolean deleted;
  @CreatedDate @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
  @CreatedBy @Column(name = "created_by", nullable = false, updatable = false, length = 128)
  private String createdBy;
  @LastModifiedDate @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
  @LastModifiedBy @Column(name = "updated_by", nullable = false, length = 128)
  private String updatedBy;
}
