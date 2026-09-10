package ca.bc.gov.nrs.hrs.entity.block;

import ca.bc.gov.nrs.hrs.entity.SoftDeletableAuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * District-average extension whose primary key is the block id.
 */
@Entity
@Table(name = "district_average_block", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(callSuper = true, exclude = "block")
public class DistrictAverageBlockEntity extends SoftDeletableAuditableEntity {

  @Id
  @Column(name = "district_average_block_id")
  @EqualsAndHashCode.Include
  private Long blockId;

  @MapsId
  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "district_average_block_id")
  private BlockEntity block;

  @Column(length = 32)
  private String benchmarkZone;

  @Column(length = 32)
  private String maturity;

  @Column(precision = 5, scale = 2)
  private BigDecimal retentionPercentage;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(columnDefinition = "integer[]")
  private List<Integer> criteria;

  @Column(precision = 12, scale = 3)
  private BigDecimal coastGroundBasedAreaHa;

  @Column(precision = 12, scale = 3)
  private BigDecimal coastHelicopterAreaHa;

  @Column(length = 32)
  private String harvestStatusCode;

  @Column(length = 32)
  private String becZone;

  @Column(length = 32)
  private String becSubvariant;

  @Column(name = "has_dispersed_retention", nullable = false)
  private Boolean hasDispersedRetention = Boolean.FALSE;

  @Column(precision = 5, scale = 2)
  private BigDecimal dispersedRetentionPct;

  private LocalDate primaryLoggingCompleteDate;

  @Column(name = "is_heli_logging", nullable = false)
  private Boolean heliLogging = Boolean.FALSE;

  @Column(precision = 12, scale = 3)
  private BigDecimal cableYardingAreaHa;

  @Column(precision = 12, scale = 3)
  private BigDecimal skylineLoggingAreaHa;

  @Column(nullable = false)
  private Long revision;
}
