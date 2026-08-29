package ca.bc.gov.nrs.hrs.entity.block;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Area or road segment used by a submission block. */
@Entity
@Table(name = "block_area_segment", schema = "hrs")
@Getter
@Setter
@NoArgsConstructor
public class BlockAreaSegmentEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(name = "block_id", nullable = false) private Long blockId;
  @Column(nullable = false, length = 32) private String source;
  @Column(precision = 12, scale = 3) private BigDecimal areaHa;
  @Column(name = "road_length_m", precision = 12, scale = 3)
  private BigDecimal roadLengthM;
  @Column(name = "road_width_m", precision = 12, scale = 3)
  private BigDecimal roadWidthM;
  private Long blockMarkId;
  @Column(precision = 12, scale = 3) private BigDecimal startingAreaHa;
  @Column(precision = 12, scale = 3) private BigDecimal netWasteAreaHa;
  @Column(nullable = false, length = 128) private String createdBy;
  @Column(nullable = false, length = 128) private String updatedBy;
  @Column(nullable = false) private Instant createdAt;
  @Column(nullable = false) private Instant updatedAt;
  @Column(nullable = false) private boolean deleted;
}
