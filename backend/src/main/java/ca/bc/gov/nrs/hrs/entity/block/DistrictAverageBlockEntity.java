package ca.bc.gov.nrs.hrs.entity.block;

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
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** District-average extension whose primary key is the block id. */
@Entity
@Table(name = "district_average_block", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class DistrictAverageBlockEntity {
  @Id @Column(name = "block_id") private Long blockId;
  @MapsId
  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "block_id")
  private BlockEntity block;
  @Column(length = 32) private String benchmarkZone;
  @Column(length = 32) private String maturity;
  @Column(precision = 5, scale = 2) private BigDecimal retentionPercentage;
  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(columnDefinition = "integer[]")
  private List<Integer> criteria;
  @Column(precision = 12, scale = 3) private BigDecimal coastGroundBasedAreaHa;
  @Column(precision = 12, scale = 3) private BigDecimal coastHelicopterAreaHa;
  @Column(length = 32) private String harvestStatusCode;
  @Column(length = 32) private String becZone;
  @Column(length = 32) private String becSubvariant;
  private Boolean hasDispersedRetention;
  @Column(precision = 5, scale = 2) private BigDecimal dispersedRetentionPct;
  private LocalDate primaryLoggingCompleteDate;
  private Boolean heliLogging;
  @Column(precision = 12, scale = 3) private BigDecimal cableYardingAreaHa;
  @Column(precision = 12, scale = 3) private BigDecimal skylineLoggingAreaHa;
  @Column(nullable = false) private Long revision;
  @Column(nullable = false, length = 128) private String createdBy;
  @Column(nullable = false, length = 128) private String updatedBy;
  @Column(nullable = false) private Instant createdAt;
  @Column(nullable = false) private Instant updatedAt;
  @Column(nullable = false) private boolean deleted;
}
