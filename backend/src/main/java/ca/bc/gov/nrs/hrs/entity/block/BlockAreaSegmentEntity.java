package ca.bc.gov.nrs.hrs.entity.block;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Area or road segment used by a submission block.
 */
@Entity
@Table(name = "block_area_segment", schema = "hrs")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
public class BlockAreaSegmentEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Long id;

  @Column(name = "block_id", nullable = false)
  private Long blockId;

  @Column(nullable = false, length = 32)
  private String source;

  @Column(precision = 12, scale = 3)
  private BigDecimal areaHa;

  @Column(name = "road_length_m", precision = 12, scale = 3)
  private BigDecimal roadLengthM;

  @Column(name = "road_width_m", precision = 12, scale = 3)
  private BigDecimal roadWidthM;

  private Long blockMarkId;

  @Column(precision = 12, scale = 3)
  private BigDecimal startingAreaHa;

  @Column(precision = 12, scale = 3)
  private BigDecimal netWasteAreaHa;

  @CreatedBy
  @Column(nullable = false, length = 128)
  private String createdBy;

  @LastModifiedBy
  @Column(nullable = false, length = 128)
  private String updatedBy;

  @CreatedDate
  @Column(nullable = false)
  private Instant createdAt;

  @LastModifiedDate
  @Column(nullable = false)
  private Instant updatedAt;

  @Column(nullable = false)
  private boolean deleted;
}
